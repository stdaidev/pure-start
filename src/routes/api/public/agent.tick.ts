import { createFileRoute } from "@tanstack/react-router";
import { authorizeInternalTick } from "@/lib/internal-tick-auth";

/**
 * F8 - Tick do agente.
 * Chamado por pg_cron/pg_net com credencial server-only em
 * `x-internal-token`, `Authorization: Bearer` ou `apikey`.
 * Processa conversas vencidas usando trava persistente em `conversations`.
 *
 * IMPORTANTE: nao usar Promise.race com timeout aqui. Sem AbortSignal real
 * dentro do runtime (chamada a OpenAI + envios via Evolution), soltar o lock
 * enquanto a Promise perdida continua rodando gera respostas duplicadas /
 * intercaladas. O budget interno de humanizacao ja limita o tempo total do
 * runtime; aqui sempre aguardamos a execucao terminar antes de liberar.
 */

const TICK_LIMIT = 10;

export const Route = createFileRoute("/api/public/agent/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = authorizeInternalTick(request);
        if (authorization === "misconfigured") {
          console.error("[agent.tick] internal token not configured");
          return new Response("Service unavailable", { status: 503 });
        }
        if (authorization !== "authorized") {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runAgentForMessage } = await import("@/lib/agent-runtime.server");

        const { data: jobs, error } = await supabaseAdmin.rpc("claim_due_agent_runs", {
          _limit: TICK_LIMIT,
        });
        if (error) {
          console.error("[agent.tick] claim failed", error.code);
          return Response.json({ ok: false }, { status: 500 });
        }

        let processed = 0;
        let failed = 0;
        for (const job of jobs ?? []) {
          try {
            // Aguarda o runtime terminar por completo (envios inclusos)
            // antes de liberar o lock. Sem cancelamento real, um race()
            // aqui abandonaria a Promise mas ela continuaria enviando.
            const runResult = await runAgentForMessage(job.message_id, job.run_token);
            if (runResult.status === "error") failed += 1;
            else processed += 1;
          } catch (err) {
            failed += 1;
            console.error("[agent.tick] runtime failed", {
              conversation: job.conversation_id,
              error: err instanceof Error ? err.message.slice(0, 160) : "unknown",
            });
          } finally {
            const { data: released, error: releaseError } = await supabaseAdmin.rpc(
              "release_agent_run",
              {
                _conversation_id: job.conversation_id,
                _run_token: job.run_token,
              },
            );
            if (releaseError || released !== true) {
              console.error("[agent.tick] conditional release failed", releaseError?.code);
            }
          }
        }

        return Response.json({ ok: true, claimed: jobs?.length ?? 0, processed, failed });
      },
    },
  },
});
