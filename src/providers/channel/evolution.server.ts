/**
 * EvolutionProvider — implementacao server-only do contrato ChannelProvider
 * para Evolution API 2.3.7.
 *
 * REGRAS:
 * - Nunca importar em bundle client (sufixo .server garante).
 * - Nunca logar telefone, texto de mensagem, QR ou apikey.
 * - Timeout curto (5s) em toda chamada externa.
 * - Erros externos viram Error generico; detalhe fica em console server-side.
 */

import type {
  ChannelProvider,
  ChannelStatus,
  CreateInstanceInput,
  CreateInstanceResult,
  InboundMessage,
  OutboundAudio,
  OutboundText,
  QrPayload,
  SendResult,
  StatusPayload,
  WebhookResult,
} from "./types";

const DEFAULT_TIMEOUT_MS = 5000;

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.EVOLUTION_BASE_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("Evolution provider not configured");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

async function evoFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<unknown> {
  const { baseUrl, apiKey } = getConfig();
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = init;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...rest,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        ...(headers ?? {}),
      },
    });

    const text = await res.text();
    if (!res.ok) {
      // Log opaco: nao expor apikey nem body do cliente
      console.error(
        `[evolution] ${rest.method ?? "GET"} ${path} -> ${res.status}`,
      );
      throw new Error(`Evolution upstream error (${res.status})`);
    }
    return text ? JSON.parse(text) : {};
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Evolution upstream timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Normaliza o estado bruto do Evolution para ChannelStatus. */
function mapState(raw: unknown): ChannelStatus {
  const s = (
    (typeof raw === "string"
      ? raw
      : (raw as { state?: string; instance?: { state?: string } })?.state ??
        (raw as { instance?: { state?: string } })?.instance?.state ??
        "") as string
  ).toLowerCase();

  switch (s) {
    case "open":
    case "connected":
      return "connected";
    case "connecting":
      return "connecting";
    case "close":
    case "closed":
    case "disconnected":
      return "disconnected";
    case "qr":
    case "qrcode":
      return "qr";
    default:
      return s ? "error" : "pending";
  }
}

function extractQr(raw: unknown): QrPayload | undefined {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const qrcode = (obj.qrcode ?? obj.qr ?? {}) as Record<string, unknown>;
  const base64 =
    (qrcode.base64 as string | undefined) ??
    (obj.base64 as string | undefined) ??
    (obj.code as string | undefined);
  if (!base64) return undefined;
  return { base64 };
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function mediaDataUrl(base64: unknown, mimeType: unknown): string | undefined {
  const raw = getString(base64);
  if (!raw) return undefined;
  if (raw.startsWith("data:")) return raw;
  const mime = (getString(mimeType) ?? "application/octet-stream").split(";")[0].trim();
  return `data:${mime};base64,${raw}`;
}

function mediaUrlFrom(message: Record<string, unknown>, media: unknown): string | undefined {
  const mediaObj = (media ?? {}) as Record<string, unknown>;
  return (
    mediaDataUrl(message.base64, mediaObj.mimetype) ??
    mediaDataUrl(mediaObj.base64, mediaObj.mimetype) ??
    getString(mediaObj.url)
  );
}

export const evolutionProvider: ChannelProvider = {
  id: "evolution",

  async createInstance(
    input: CreateInstanceInput,
  ): Promise<CreateInstanceResult> {
    const raw = (await evoFetch("/instance/create", {
      method: "POST",
      timeoutMs: 25000,
      body: JSON.stringify({
        instanceName: input.name,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: {
          enabled: true,
          url: input.webhookUrl,
          byEvents: false,
          base64: true,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          headers: input.webhookHeaders ?? undefined,
        },
      }),
    })) as Record<string, unknown>;

    return {
      providerInstanceId: input.name,
      qr: extractQr(raw),
      status: { status: mapState(raw) },
    };
  },

  async getQrCode(providerInstanceId: string): Promise<QrPayload> {
    const raw = await evoFetch(
      `/instance/connect/${encodeURIComponent(providerInstanceId)}`,
      { method: "GET", timeoutMs: 20000 },
    );
    const qr = extractQr(raw);
    if (!qr) throw new Error("QR indisponivel");
    return qr;
  },

  async getStatus(providerInstanceId: string): Promise<StatusPayload> {
    const raw = await evoFetch(
      `/instance/connectionState/${encodeURIComponent(providerInstanceId)}`,
      { method: "GET" },
    );
    return { status: mapState(raw), lastSeenAt: Date.now() };
  },

  async setSettings(
    providerInstanceId: string,
    settings: { groupsIgnore?: boolean },
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (settings.groupsIgnore !== undefined) {
      body.groups_ignore = settings.groupsIgnore;
      body.groupsIgnore = settings.groupsIgnore;
    }
    await evoFetch(
      `/settings/set/${encodeURIComponent(providerInstanceId)}`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  async sendText(
    providerInstanceId: string,
    msg: OutboundText,
  ): Promise<SendResult> {
    const raw = (await evoFetch(
      `/message/sendText/${encodeURIComponent(providerInstanceId)}`,
      {
        method: "POST",
        body: JSON.stringify({ number: msg.to, text: msg.text }),
      },
    )) as Record<string, unknown>;
    const key = (raw.key ?? {}) as Record<string, unknown>;
    return { providerMessageId: (key.id as string) ?? String(Date.now()) };
  },

  async sendTyping(
    providerInstanceId: string,
    to: string,
    durationMs: number,
  ): Promise<void> {
    try {
      await evoFetch(
        `/chat/sendPresence/${encodeURIComponent(providerInstanceId)}`,
        {
          method: "POST",
          body: JSON.stringify({
            number: to,
            presence: "composing",
            delay: Math.max(500, Math.min(durationMs, 15000)),
          }),
        },
      );
    } catch {
      // presence e best-effort; nunca falha o envio
    }
  },

  async sendAudio(
    providerInstanceId: string,
    msg: OutboundAudio,
  ): Promise<SendResult> {
    const raw = (await evoFetch(
      `/message/sendWhatsAppAudio/${encodeURIComponent(providerInstanceId)}`,
      {
        method: "POST",
        body: JSON.stringify({ number: msg.to, audio: msg.audio }),
      },
    )) as Record<string, unknown>;
    const key = (raw.key ?? {}) as Record<string, unknown>;
    return { providerMessageId: (key.id as string) ?? String(Date.now()) };
  },

  async deleteInstance(providerInstanceId: string): Promise<void> {
    // Best-effort: logout + delete (Evolution exige logout antes de delete).
    try {
      await evoFetch(
        `/instance/logout/${encodeURIComponent(providerInstanceId)}`,
        { method: "DELETE" },
      );
    } catch {
      // ja pode estar deslogado; segue para delete
    }
    await evoFetch(
      `/instance/delete/${encodeURIComponent(providerInstanceId)}`,
      { method: "DELETE" },
    );
  },

  async handleWebhook(rawBody: unknown): Promise<WebhookResult> {
    const body = (rawBody ?? {}) as Record<string, unknown>;
    const event = (body.event as string | undefined)?.toLowerCase() ?? "";
    const data = (body.data ?? {}) as Record<string, unknown>;

    // CONNECTION_UPDATE -> status change
    if (event.includes("connection.update") || event.includes("connection_update")) {
      return {
        messages: [],
        statusChange: { status: mapState(data), lastSeenAt: Date.now() },
      };
    }

    // MESSAGES_UPSERT -> inbound messages
    if (event.includes("messages.upsert") || event.includes("messages_upsert")) {
      const list = Array.isArray(data)
        ? (data as unknown[])
        : Array.isArray((data as { messages?: unknown[] }).messages)
          ? ((data as { messages: unknown[] }).messages)
          : [data];

      const messages: InboundMessage[] = [];
      for (const raw of list) {
        const m = (raw ?? {}) as Record<string, unknown>;
        const key = (m.key ?? {}) as Record<string, unknown>;
        let message = (m.message ?? {}) as Record<string, unknown>;
        // Unwrap view-once / ephemeral / device-sent wrappers
        for (let i = 0; i < 3; i++) {
          const wrapper =
            (message.viewOnceMessage as { message?: Record<string, unknown> } | undefined) ??
            (message.viewOnceMessageV2 as { message?: Record<string, unknown> } | undefined) ??
            (message.viewOnceMessageV2Extension as { message?: Record<string, unknown> } | undefined) ??
            (message.ephemeralMessage as { message?: Record<string, unknown> } | undefined) ??
            (message.deviceSentMessage as { message?: Record<string, unknown> } | undefined);
          if (wrapper?.message) {
            message = wrapper.message;
          } else {
            break;
          }
        }
        const remoteJid = (key.remoteJid as string | undefined) ?? "";
        const fromMe = Boolean(key.fromMe);
        const id =
          (key.id as string | undefined) ??
          (m.id as string | undefined) ??
          `${Date.now()}`;

        let kind: InboundMessage["kind"] = "other";
        let text: string | undefined;
        let mediaUrl: string | undefined;

        if (typeof message.conversation === "string") {
          kind = "text";
          text = message.conversation;
        } else if (
          (message.extendedTextMessage as { text?: string } | undefined)?.text
        ) {
          kind = "text";
          text = (message.extendedTextMessage as { text: string }).text;
        } else if (message.audioMessage) {
          kind = "audio";
          mediaUrl = mediaUrlFrom(message, message.audioMessage);
        } else if (message.imageMessage) {
          kind = "image";
          mediaUrl = mediaUrlFrom(message, message.imageMessage);
        } else if (message.videoMessage) {
          kind = "video";
          mediaUrl = mediaUrlFrom(message, message.videoMessage);
        } else if (message.documentMessage) {
          kind = "document";
          mediaUrl = mediaUrlFrom(message, message.documentMessage);
        }

        messages.push({
          providerMessageId: id,
          from: fromMe ? "self" : remoteJid,
          to: fromMe ? remoteJid : "self",
          direction: fromMe ? "outbound" : "inbound",
          kind,
          text,
          mediaUrl,
          timestamp:
            typeof m.messageTimestamp === "number"
              ? (m.messageTimestamp as number) * 1000
              : Date.now(),
        });
      }
      return { messages };
    }

    return { messages: [] };
  },
};

export async function configureEvolutionWebhook(
  providerInstanceId: string,
  input: { webhookUrl: string; webhookHeaders?: Record<string, string> },
): Promise<void> {
  await evoFetch(`/webhook/set/${encodeURIComponent(providerInstanceId)}`, {
    method: "POST",
    timeoutMs: 10000,
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: input.webhookUrl,
        byEvents: false,
        base64: true,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
        headers: input.webhookHeaders ?? undefined,
      },
    }),
  });
}