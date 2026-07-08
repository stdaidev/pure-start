import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { evolutionProvider } from "@/providers/channel/evolution.server";
import {
  isWithinWindow,
  nextDelayMs,
  dailyCapRemaining,
  dateKeySaoPaulo,
} from "@/lib/anti-ban";

/**
 * F6 T8 - Worker de disparo.
 * Chamado por /api/public/dispatch/tick (pg_cron 1/min).
 *
 * - Nenhum log expoe telefone/rendered_text.
 * - Kill-switch: status da campanha e re-checado antes de cada envio.
 * - Opt-out: dupla checagem via contacts.opt_out.
 * - Anti-ban: janela horaria SP, teto diario, delay aleatorio [min,max].
 */

type Db = SupabaseClient<Database>;

export type TickResult = {
  campaigns: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type TickOptions = {
  now?: Date;
  maxSendsPerTick?: number;
  provider?: {
    sendText: (
      instance: string,
      msg: { to: string; text: string },
    ) => Promise<{ providerMessageId: string }>;
  };
};

export async function runDispatchTick(
  db: Db,
  opts: TickOptions = {},
): Promise<TickResult> {
  const now = opts.now ?? new Date();
  const maxSends = opts.maxSendsPerTick ?? 5;
  const provider = opts.provider ?? evolutionProvider;
  const result: TickResult = { campaigns: 0, sent: 0, failed: 0, skipped: 0 };

  const { data: campaigns, error } = await db
    .from("campaigns")
    .select(
      "id, workspace_id, connection_id, status, min_ms, max_ms, daily_cap, window_start, window_end, warmup_per_day, sent_today, sent_today_date, started_at",
    )
    .eq("status", "running");
  if (error) throw new Error("Falha ao listar campanhas running");

  for (const c of campaigns ?? []) {
    result.campaigns++;
    if (!isWithinWindow(now, { start: c.window_start, end: c.window_end }))
      continue;
    if (!c.connection_id) continue;

    const { data: conn } = await db
      .from("connections")
      .select("instance_name, status")
      .eq("id", c.connection_id)
      .maybeSingle();
    if (!conn?.instance_name) continue;

    const startedAt = c.started_at ? new Date(c.started_at) : null;
    let remaining = dailyCapRemaining({
      dailyCap: c.daily_cap,
      warmupPerDay: c.warmup_per_day,
      startedAt,
      sentToday: c.sent_today,
      sentTodayDate: c.sent_today_date,
      now,
    });

    for (let i = 0; i < maxSends && remaining > 0; i++) {
      // Re-check status (kill-switch).
      const { data: fresh } = await db
        .from("campaigns")
        .select("status")
        .eq("id", c.id)
        .maybeSingle();
      if (fresh?.status !== "running") break;

      // Proximo pending. Sem SKIP LOCKED via PostgREST; usamos update por id como claim.
      const { data: cand } = await db
        .from("campaign_recipients")
        .select("id, contact_phone, variables")
        .eq("campaign_id", c.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cand) break;

      // Claim: marca como sending (fica pending caso contrario -> outra tick pega).
      const { data: claimed } = await db
        .from("campaign_recipients")
        .update({ status: "sending" })
        .eq("id", cand.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      // Opt-out double-check.
      const { data: contact } = await db
        .from("contacts")
        .select("opt_out")
        .eq("workspace_id", c.workspace_id)
        .eq("phone", cand.contact_phone)
        .maybeSingle();
      if (contact?.opt_out) {
        await db
          .from("campaign_recipients")
          .update({ status: "skipped_optout" })
          .eq("id", cand.id);
        result.skipped++;
        continue;
      }

      const vars = (cand.variables ?? {}) as Record<string, unknown>;
      const text = String(vars.rendered_text ?? "");
      if (!text) {
        await db
          .from("campaign_recipients")
          .update({ status: "failed", error: "empty_text" })
          .eq("id", cand.id);
        result.failed++;
        continue;
      }

      try {
        await provider.sendText(conn.instance_name, {
          to: normalizeMsisdn(cand.contact_phone),
          text,
        });
        await db
          .from("campaign_recipients")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", cand.id);
        result.sent++;

        // Atualiza sent_today.
        const today = dateKeySaoPaulo(now);
        const newCount =
          c.sent_today_date === today ? c.sent_today + 1 : 1;
        await db
          .from("campaigns")
          .update({ sent_today: newCount, sent_today_date: today })
          .eq("id", c.id);
        c.sent_today = newCount;
        c.sent_today_date = today;
        remaining--;
      } catch (e) {
        await db
          .from("campaign_recipients")
          .update({
            status: "failed",
            error: e instanceof Error ? e.message.slice(0, 200) : "send_failed",
          })
          .eq("id", cand.id);
        result.failed++;
      }

      // Delay aleatorio dentro do tick (bounded).
      const delay = Math.min(nextDelayMs(c.min_ms, c.max_ms, Math.random), 15000);
      await sleep(delay);
    }

    // Se acabaram os pendentes, finaliza.
    const { count: pendingLeft } = await db
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id)
      .eq("status", "pending");
    if ((pendingLeft ?? 0) === 0) {
      await db
        .from("campaigns")
        .update({ status: "finished", finished_at: new Date().toISOString() })
        .eq("id", c.id)
        .eq("status", "running");
    }
  }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}