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

const RUNTIME_HARD_CAP_MS = 12_000;

export const Route = createFileRoute("/api/public/evolution/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.WEBHOOK_VERIFY_TOKEN;
        if (!expected) {
          console.error("[webhook/evolution] server misconfigured");
          return new Response("server misconfigured", { status: 500 });
        }

        const provided = request.headers.get("x-webhook-token") ?? "";
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

        const eventType =
          (body as { event?: string })?.event ?? "unknown";

        // Grava auditoria bruta primeiro (idempotencia externa fica com o provedor)
        const { data: evt } = await supabaseAdmin
          .from("webhook_events")
          .insert({
            workspace_id: DEFAULT_WORKSPACE,
            provider: "evolution",
            event_type: eventType,
            payload: body as never,
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
          if (parsed.statusChange && instance) {
            await supabaseAdmin
              .from("connections")
              .update({ status: parsed.statusChange.status })
              .eq("workspace_id", DEFAULT_WORKSPACE)
              .eq("instance_name", instance);
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
            if (instance) {
              const { data: conn } = await supabaseAdmin
                .from("connections")
                .select("id")
                .eq("workspace_id", DEFAULT_WORKSPACE)
                .eq("instance_name", instance)
                .maybeSingle();
              connectionId = conn?.id ?? null;
            }

            // Upsert conversation (contact + connection)
            let conversationId: string | null = null;
            if (contact) {
              const { data: existing } = await supabaseAdmin
                .from("conversations")
                .select("id")
                .eq("workspace_id", DEFAULT_WORKSPACE)
                .eq("contact_id", contact.id)
                .maybeSingle();
              if (existing) {
                conversationId = existing.id;
                await supabaseAdmin
                  .from("conversations")
                  .update({ last_message_at: new Date(m.timestamp).toISOString() })
                  .eq("id", existing.id);
              } else {
                const { data: created } = await supabaseAdmin
                  .from("conversations")
                  .insert({
                    workspace_id: DEFAULT_WORKSPACE,
                    contact_id: contact.id,
                    connection_id: connectionId,
                    status: "open",
                    last_message_at: new Date(m.timestamp).toISOString(),
                  })
                  .select("id")
                  .single();
                conversationId = created?.id ?? null;
              }
            }

            if (!conversationId) continue;

            // Idempotencia manual: verifica antes de inserir
            const { data: dup } = await supabaseAdmin
              .from("messages")
              .select("id")
              .eq("workspace_id", DEFAULT_WORKSPACE)
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

            // Runtime do agente: so para inbound text. Nunca falha o 200.
            if (m.direction === "inbound" && m.kind === "text" && insertedMsg?.id) {
              try {
                const { runAgentForMessage } = await import(
                  "@/lib/agent-runtime.server"
                );
                await Promise.race([
                  runAgentForMessage(insertedMsg.id),
                  new Promise((_, rej) =>
                    setTimeout(
                      () => rej(new Error("runtime timeout")),
                      RUNTIME_HARD_CAP_MS,
                    ),
                  ),
                ]);
              } catch (e) {
                console.error(
                  "[webhook/evolution] runtime error:",
                  (e as Error).message,
                );
              }
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