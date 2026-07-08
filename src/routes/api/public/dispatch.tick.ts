import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * F6 T8 - Tick do worker de disparo.
 * Chamado por pg_cron via pg_net com header `apikey` = SUPABASE anon key.
 * Bypass de auth do prefixo /api/public/* + validacao propria.
 */

function bufEq(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const Route = createFileRoute("/api/public/dispatch/tick")({
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
        const { runDispatchTick } = await import(
          "@/lib/dispatch-worker.server"
        );

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