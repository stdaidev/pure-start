import { createFileRoute } from "@tanstack/react-router";
import { authorizeConfiguredInternalTick } from "@/lib/internal-tick-auth";

/**
 * F6 T8 - Tick do worker de disparo.
 * Chamado por pg_cron via pg_net com credencial server-only.
 * Bypass de auth do prefixo /api/public/* + validacao propria.
 */

export const Route = createFileRoute("/api/public/dispatch/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = await authorizeConfiguredInternalTick(request);
        if (authorization === "misconfigured") {
          console.error("[dispatch.tick] internal token not configured");
          return new Response("Service unavailable", { status: 503 });
        }
        if (authorization !== "authorized") {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runDispatchTick } = await import("@/lib/dispatch-worker.server");

        try {
          const result = await runDispatchTick(supabaseAdmin);
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[dispatch.tick] failed", {
            error: e instanceof Error ? e.message.slice(0, 200) : "unknown",
          });
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
