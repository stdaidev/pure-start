import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * F8 - Tick do agente.
 * Chamado por pg_cron/pg_net com header `apikey` = chave publica do backend.
 * Processa conversas vencidas usando trava persistente em `conversations`.
 */

const RUNTIME_HARD_CAP_MS = 12_000;
const TICK_LIMIT = 10;

function bufEq(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const Route = createFileRoute("/api/public/agent/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ??
          process.env.SUPABASE_ANON_KEY ??
          "";
        const provided = request.headers.get("apikey") ?? "";
        if (!expected || !provided || !bufEq(expected, provided)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { runAgentForMessage } = await import(
          "@/lib/agent-runtime.server"
        );

        const { data: jobs, error } = await supabaseAdmin.rpc(
          "claim_due_agent_runs",
          { _limit: TICK_LIMIT },
        );
        if (error) {
          console.error("[agent.tick] claim failed", error.code);
          return Response.json({ ok: false }, { status: 500 });
        }

        let processed = 0;
        let failed = 0;
        for (const job of jobs ?? []) {
          try {
            await Promise.race([
              runAgentForMessage(job.message_id),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("runtime timeout")),
                  RUNTIME_HARD_CAP_MS,
                ),
              ),
            ]);
            processed += 1;
          } catch (err) {
            failed += 1;
            console.error("[agent.tick] runtime failed", {
              conversation: job.conversation_id,
              error: err instanceof Error ? err.message.slice(0, 160) : "unknown",
            });
          } finally {
            await supabaseAdmin.rpc("release_agent_run", {
              _conversation_id: job.conversation_id,
            });
          }
        }

        return Response.json({ ok: true, claimed: jobs?.length ?? 0, processed, failed });
      },
    },
  },
});