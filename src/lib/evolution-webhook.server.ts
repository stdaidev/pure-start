const WEBHOOK_PATH = "/api/public/evolution/webhook";
const PUBLISHED_BASE = "https://light-springboard.lovable.app";

function isUnsafePreviewBase(value: string): boolean {
  return (
    value.includes("localhost") ||
    value.includes("127.0.0.1") ||
    value.includes("id-preview--")
  );
}

function stripWebhookToken(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete("token");
    url.searchParams.delete("x-webhook-token");
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function getPublicEvolutionWebhookUrl(): string {
  const explicit = process.env.PUBLIC_WEBHOOK_URL ?? process.env.PUBLIC_BASE_URL;
  const candidate = explicit && !isUnsafePreviewBase(explicit) ? explicit : PUBLISHED_BASE;
  const normalized = stripWebhookToken(candidate).replace(/\/+$/, "");
  return normalized.endsWith(WEBHOOK_PATH) ? normalized : `${normalized}${WEBHOOK_PATH}`;
}

export function getEvolutionWebhookDeliveryConfig(): {
  publicUrl: string;
  deliveryUrl: string;
  headers: Record<string, string>;
} {
  const publicUrl = getPublicEvolutionWebhookUrl();
  const token = process.env.WEBHOOK_VERIFY_TOKEN?.trim();
  const headers = token ? { "x-webhook-token": token } : {};
  const url = new URL(publicUrl);
  if (token) url.searchParams.set("token", token);
  return { publicUrl, deliveryUrl: url.toString(), headers };
}

export function sanitizeEvolutionWebhookPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const copy = { ...(raw as Record<string, unknown>) };
  delete copy.apikey;
  if (typeof copy.destination === "string") {
    copy.destination = stripWebhookToken(copy.destination);
  }
  return copy;
}