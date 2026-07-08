import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual, createHash } from "node:crypto";

/**
 * Webhook publico do Evolution.
 *
 * SEGURANCA:
 * - Requer header `x-webhook-token` == WEBHOOK_VERIFY_TOKEN.
 * - Comparacao com timingSafeEqual sobre buffers de mesmo tamanho.
 * - Sem PII em log/response; erros externos viram 200 (idempotencia) + `error` no audit.
 * - Delegacao de parsing para EvolutionProvider.handleWebhook (nao confia no shape aqui).
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

function bufEq(a: string, b: string): boolean {
  // Normaliza tamanhos hasheando ambos (evita leak de tamanho, compare constante)
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function jidToPhone(jid: string): string {
  // remove sufixo @s.whatsapp.net / @g.us e mantem so digitos
  return jid.replace(/@.*$/, "").replace(/[^0-9]/g, "");
}

function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us");
}

function getProvidedToken(request: Request): string {
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") ?? "";
  return (
    request.headers.get("x-webhook-token") ??
    url.searchParams.get("token") ??
    url.searchParams.get("x-webhook-token") ??
    (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "")
  );
}

// F8 - Debounce persistente por conversation_id.
// O webhook apenas agenda no banco; /api/public/agent/tick processa depois.
const DEBOUNCE_DEFAULT_MS = 4_000;
const DEBOUNCE_CAP_MS = 10_000;

function getDefaultDebounceMs(): number {
  const raw = Number(process.env.AGENT_DEBOUNCE_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEBOUNCE_DEFAULT_MS;
  return Math.min(raw, DEBOUNCE_CAP_MS);
}

function getDebounceDelayMs(agentDebounceSeconds: number | null): number {
  return agentDebounceSeconds && agentDebounceSeconds > 0
    ? Math.min(agentDebounceSeconds * 1000, DEBOUNCE_CAP_MS)
    : getDefaultDebounceMs();
}

async function scheduleAgentRun(
  supabaseAdmin: Awaited<
    typeof import("@/integrations/supabase/client.server")
  >["supabaseAdmin"],
  conversationId: string,
  messageId: string,
  agentDebounceSeconds: number | null,
): Promise<void> {
  const delay = getDebounceDelayMs(agentDebounceSeconds);
  const { error } = await supabaseAdmin.rpc("schedule_agent_run", {
    _conversation_id: conversationId,
    _message_id: messageId,
    _delay_ms: delay,
  });
  if (error) {
    console.error("[webhook/evolution] schedule_agent_run failed", error.code);
    return;
  }
  console.log(
    `[webhook/evolution] queued-agent-run conversation=${conversationId} delay=${delay}`,
  );
}

export const Route = createFileRoute("/api/public/evolution/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.WEBHOOK_VERIFY_TOKEN;
        if (!expected) {
          console.error("[webhook/evolution] server misconfigured");
          return new Response("server misconfigured", { status: 500 });
        }

        const provided = getProvidedToken(request);
        if (!provided || !bufEq(provided, expected)) {
          // 401 opaco, sem echo do token nem PII
          return new Response("unauthorized", { status: 401 });
        }

        // Le body como texto para poder logar tamanho sem tocar em PII
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("bad json", { status: 400 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { evolutionProvider } = await import(
          "@/providers/channel/evolution.server"
        );
        const { sanitizeEvolutionWebhookPayload } = await import(
          "@/lib/evolution-webhook.server"
        );

        const eventType =
          (body as { event?: string })?.event ?? "unknown";

        // Grava auditoria bruta primeiro (idempotencia externa fica com o provedor)
        const { data: evt } = await supabaseAdmin
          .from("webhook_events")
          .insert({
            workspace_id: DEFAULT_WORKSPACE,
            provider: "evolution",
            event_type: eventType,
             payload: sanitizeEvolutionWebhookPayload(body) as never,
            processed: false,
          })
          .select("id")
          .single();

        try {
          const parsed = await evolutionProvider.handleWebhook(body);

          // Atualiza status da connection por instance name, se veio no payload
          const instance =
            (body as { instance?: string })?.instance ??
            ((body as { sender?: string })?.sender ?? null);

          // Extrai o JID/telefone dono da instancia (varia por versao do Evolution).
          // Ex.: body.sender = "5528999914358@s.whatsapp.net", body.data.owner, etc.
          const ownerCandidate =
            (body as { sender?: string })?.sender ??
            ((body as { data?: { owner?: string } })?.data?.owner) ??
            ((body as { data?: { instance?: string } })?.data?.instance) ??
            null;
          const ownerPhone =
            ownerCandidate && ownerCandidate.includes("@")
              ? jidToPhone(ownerCandidate)
              : null;

          if (parsed.statusChange && instance) {
            await supabaseAdmin
              .from("connections")
              .update({ status: parsed.statusChange.status })
              .eq("workspace_id", DEFAULT_WORKSPACE)
              .eq("instance_name", instance);
          }

          // Persiste own_phone na connection para deduplicar loops entre instancias
          // (cliente + vendedor conectados no mesmo workspace).
          if (instance && ownerPhone) {
            const { data: currentConn } = await supabaseAdmin
              .from("connections")
              .select("id, metadata")
              .eq("workspace_id", DEFAULT_WORKSPACE)
              .eq("instance_name", instance)
              .maybeSingle();
            const meta = (currentConn?.metadata ?? {}) as Record<string, unknown>;
            if (currentConn && meta.own_phone !== ownerPhone) {
              await supabaseAdmin
                .from("connections")
                .update({ metadata: { ...meta, own_phone: ownerPhone } as never })
                .eq("id", currentConn.id);
            }
          }

          // Carrega telefones de outras conexoes do workspace para pular
          // mensagens espelhadas (ex.: cliente-instance recebe o mesmo evento
          // que a vendedor-instance ja processou).
          const { data: allConns } = await supabaseAdmin
            .from("connections")
            .select("instance_name, metadata")
            .eq("workspace_id", DEFAULT_WORKSPACE);
          const otherOwnPhones = new Set<string>();
          for (const c of allConns ?? []) {
            if (c.instance_name === instance) continue;
            const p = (c.metadata as { own_phone?: unknown } | null)?.own_phone;
            if (typeof p === "string" && p) otherOwnPhones.add(p);
          }

          // Projeta mensagens em contacts + conversations + messages
          for (const m of parsed.messages) {
            const remote = m.direction === "inbound" ? m.from : m.to;
            // Filtra grupos por conexao (default: ignora).
            if (isGroupJid(remote)) {
              // Se nao ha connection, aplica default (ignora).
              let ignore = true;
              if (instance) {
                const { data: c } = await supabaseAdmin
                  .from("connections")
                  .select("ignore_groups")
                  .eq("workspace_id", DEFAULT_WORKSPACE)
                  .eq("instance_name", instance)
                  .maybeSingle();
                ignore = c?.ignore_groups ?? true;
              }
              if (ignore) continue;
            }
            const phone = jidToPhone(remote);
            if (!phone) continue;

            // Skip apenas o ECO outbound: quando esta instancia mandou (fromMe)
            // para outra conexao nossa, a instancia destinataria vai projetar
            // como inbound. Nunca pulamos inbound - se o proprio lead responder
            // (inclusive apos handoff humano) a mensagem precisa ser gravada.
            if (m.direction === "outbound" && otherOwnPhones.has(phone)) continue;

            // Upsert contato por (workspace, phone)
            const { data: contact } = await supabaseAdmin
              .from("contacts")
              .upsert(
                {
                  workspace_id: DEFAULT_WORKSPACE,
                  phone,
                },
                { onConflict: "workspace_id,phone" },
              )
              .select("id")
              .single();

            // Localiza connection pela instancia (opcional)
            let connectionId: string | null = null;
            let defaultAgentId: string | null = null;
            if (instance) {
              const { data: conn } = await supabaseAdmin
                .from("connections")
                .select("id, default_agent_id")
                .eq("workspace_id", DEFAULT_WORKSPACE)
                .eq("instance_name", instance)
                .maybeSingle();
              connectionId = conn?.id ?? null;
              defaultAgentId = conn?.default_agent_id ?? null;
            }

            // Upsert conversation (contact + connection)
            let conversationId: string | null = null;
            if (contact) {
              // Escopo por (workspace, contact, connection) para nao misturar
              // conversas de instancias diferentes do WhatsApp (ex: cliente x vendedor)
              // que compartilham os mesmos numeros de telefone.
              let existingQuery = supabaseAdmin
                .from("conversations")
                .select("id, agent_id, connection_id")
                .eq("workspace_id", DEFAULT_WORKSPACE)
                .eq("contact_id", contact.id);
              existingQuery = connectionId
                ? existingQuery.eq("connection_id", connectionId)
                : existingQuery.is("connection_id", null);
              const { data: existing } = await existingQuery.maybeSingle();
              if (existing) {
                conversationId = existing.id;
                const patch: {
                  last_message_at: string;
                  connection_id?: string;
                  agent_id?: string;
                } = {
                  last_message_at: new Date(m.timestamp).toISOString(),
                };
                if (!existing.connection_id && connectionId) {
                  patch.connection_id = connectionId;
                }
                if (!existing.agent_id && defaultAgentId) {
                  patch.agent_id = defaultAgentId;
                }
                await supabaseAdmin
                  .from("conversations")
                  .update(patch)
                  .eq("id", existing.id);
              } else {
                const { data: created } = await supabaseAdmin
                  .from("conversations")
                  .insert({
                    workspace_id: DEFAULT_WORKSPACE,
                    contact_id: contact.id,
                    connection_id: connectionId,
                    agent_id: defaultAgentId,
                    status: "open",
                    last_message_at: new Date(m.timestamp).toISOString(),
                  })
                  .select("id")
                  .single();
                conversationId = created?.id ?? null;
              }
            }

            if (!conversationId) continue;

            // Idempotencia manual: escopo por conversa (o mesmo id do WhatsApp
            // aparece em instancias diferentes: cliente fromMe=true e vendedor
            // fromMe=false compartilham o mesmo key.id).
            const { data: dup } = await supabaseAdmin
              .from("messages")
              .select("id")
              .eq("workspace_id", DEFAULT_WORKSPACE)
              .eq("conversation_id", conversationId)
              .eq("external_id", m.providerMessageId)
              .maybeSingle();
            if (dup) continue;

            const { data: insertedMsg, error: insErr } = await supabaseAdmin.from("messages").insert({
              workspace_id: DEFAULT_WORKSPACE,
              conversation_id: conversationId,
              direction: m.direction,
              content: m.text ?? null,
              media_url: m.mediaUrl ?? null,
              media_type: m.kind === "text" ? null : m.kind,
              status: "received",
              external_id: m.providerMessageId,
            }).select("id").single();
            if (insErr) {
              console.error("[webhook/evolution] message insert failed:", insErr.code);
              continue;
            }

            // F6.1 T4 - Stop-on-reply: se e inbound, marca recipients em
            // campanhas running deste contato para nao enviar mais.
            if (m.direction === "inbound" && phone) {
              const { data: runningCamps } = await supabaseAdmin
                .from("campaigns")
                .select("id")
                .eq("workspace_id", DEFAULT_WORKSPACE)
                .eq("status", "running");
              const runningIds = (runningCamps ?? []).map((r) => r.id);
              if (runningIds.length > 0) {
                await supabaseAdmin
                  .from("campaign_recipients")
                  .update({ status: "stopped_reply" })
                  .eq("workspace_id", DEFAULT_WORKSPACE)
                  .eq("contact_phone", phone)
                  .in("status", ["pending", "sending"])
                  .in("campaign_id", runningIds);
              }
            }

            // Runtime do agente: so para inbound text. Nunca falha o 200.
            if (m.direction === "inbound" && m.kind === "text" && insertedMsg?.id) {
              // F9 - Blocklist: se o numero esta na lista de ignorados,
              // grava mensagem normalmente mas nao agenda run do agente.
              const { data: blocked } = await supabaseAdmin
                .from("agent_ignored_numbers")
                .select("id")
                .eq("workspace_id", DEFAULT_WORKSPACE)
                .eq("phone_e164", phone)
                .maybeSingle();
              if (blocked) {
                console.log(
                  `[webhook/evolution] ignored-number conversation=${conversationId}`,
                );
                continue;
              }

              // Resolve o debounce do agente da conversa (fallback: default do sistema).
              let agentDebounceSeconds: number | null = null;
              const { data: convRow } = await supabaseAdmin
                .from("conversations")
                .select("agent_id")
                .eq("id", conversationId)
                .maybeSingle();
              if (convRow?.agent_id) {
                const { data: agentRow } = await supabaseAdmin
                  .from("agents")
                  .select("debounce_seconds")
                  .eq("id", convRow.agent_id)
                  .maybeSingle();
                agentDebounceSeconds =
                  (agentRow as { debounce_seconds?: number | null } | null)
                    ?.debounce_seconds ?? null;
              }
              await scheduleAgentRun(
                supabaseAdmin,
                conversationId,
                insertedMsg.id,
                agentDebounceSeconds,
              );
            }
          }

          if (evt) {
            await supabaseAdmin
              .from("webhook_events")
              .update({ processed: true })
              .eq("id", evt.id);
          }

          return new Response("ok", { status: 200 });
        } catch (err) {
          // Nao vaza detalhes; registra generico no audit
          const msg = (err as Error).message ?? "handler error";
          if (evt) {
            await supabaseAdmin
              .from("webhook_events")
              .update({ error: msg.slice(0, 500) })
              .eq("id", evt.id);
          }
          console.error("[webhook/evolution] handler error");
          // 200 para o provedor nao entrar em retry infinito
          return new Response("ok", { status: 200 });
        }
      },
    },
  },
});