import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { evolutionProvider } from "@/providers/channel/evolution.server";
import {
  isWithinWindow,
  nextDelayMs,
  dailyCapRemaining,
  dateKeySaoPaulo,
} from "@/lib/anti-ban";
import { pickConnection } from "@/lib/dispatch-connection.server";

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

  // F6.1: kill-switch por workspace. Se algum workspace estiver pausado,
  // pula todas as campanhas dele.
  const { data: pausedWs } = await db
    .from("workspaces")
    .select("id")
    .eq("dispatch_paused", true);
  const pausedSet = new Set((pausedWs ?? []).map((w) => w.id));

  const { data: campaigns, error } = await db
    .from("campaigns")
    .select(
      "id, workspace_id, connection_id, status, min_ms, max_ms, daily_cap, hourly_limit, sent_this_hour, sent_this_hour_at, window_start, window_end, warmup_per_day, sent_today, sent_today_date, started_at, dispatch_mode, cooldown_enabled, cooldown_value",
    )
    .eq("status", "running");
  if (error) throw new Error("Falha ao listar campanhas running");

  for (const c of campaigns ?? []) {
    result.campaigns++;
    if (pausedSet.has(c.workspace_id)) continue;
    if (!isWithinWindow(now, { start: c.window_start, end: c.window_end }))
      continue;

    const startedAt = c.started_at ? new Date(c.started_at) : null;
    let remaining = dailyCapRemaining({
      dailyCap: c.daily_cap,
      warmupPerDay: c.warmup_per_day,
      startedAt,
      sentToday: c.sent_today,
      sentTodayDate: c.sent_today_date,
      now,
    });

    // Hourly cap: reset se mudou a hora corrente.
    const currentHourKey = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
    ).toISOString();
    const sentThisHourAt = c.sent_this_hour_at
      ? new Date(c.sent_this_hour_at).toISOString()
      : null;
    const sentThisHourAtHour = sentThisHourAt
      ? new Date(sentThisHourAt).setMinutes(0, 0, 0)
      : null;
    const nowHour = new Date(currentHourKey).getTime();
    let sentThisHour =
      sentThisHourAtHour === nowHour ? c.sent_this_hour : 0;
    const hourlyRemaining = Math.max(0, c.hourly_limit - sentThisHour);
    if (hourlyRemaining <= 0) continue;
    remaining = Math.min(remaining, hourlyRemaining);

    for (let i = 0; i < maxSends && remaining > 0; i++) {
      // Re-check status (kill-switch) + hourly cap fresco do DB para
      // evitar corrida quando dois ticks concorrentes disparam (ex: clique
      // duplo em "Disparar agora").
      const { data: fresh } = await db
        .from("campaigns")
        .select("status, sent_this_hour, sent_this_hour_at, hourly_limit")
        .eq("id", c.id)
        .maybeSingle();
      if (fresh?.status !== "running") break;
      const freshHourAt = fresh.sent_this_hour_at
        ? new Date(fresh.sent_this_hour_at).setMinutes(0, 0, 0)
        : null;
      const freshSentThisHour =
        freshHourAt === nowHour ? fresh.sent_this_hour : 0;
      if (freshSentThisHour >= fresh.hourly_limit) break;
      sentThisHour = freshSentThisHour;

      // F6.1: claim considera next_send_at para nao rajar todo mundo agora.
      const nowIso = new Date().toISOString();
      const { data: cand } = await db
        .from("campaign_recipients")
        .select("id, contact_phone, contact_name, variables, attempt_count")
        .eq("campaign_id", c.id)
        .eq("status", "pending")
        .or(`next_send_at.is.null,next_send_at.lte.${nowIso}`)
        .order("next_send_at", { ascending: true, nullsFirst: true })
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

      // F6.1: escolhe conexao (single ou round-robin em multi).
      const picked = await pickConnection(db, {
        id: c.id,
        workspace_id: c.workspace_id,
        connection_id: c.connection_id,
        dispatch_mode: c.dispatch_mode,
      });
      if (!picked) {
        // Sem conexao usavel: devolve para pending e sai da campanha.
        await db
          .from("campaign_recipients")
          .update({ status: "pending" })
          .eq("id", cand.id);
        break;
      }

      // F-antiban-conexao: reserva vaga ATOMICA por conexao (FOR UPDATE +
      // UPDATE condicional). Impede que dois workers concorrentes passem
      // no mesmo slot. Se excedeu, devolve para pending com next_send_at
      // futuro (nao marca failed). Vaga sera liberada (release) se o
      // envio falhar, para nao gastar cota a toa.
      const { data: reserveRes } = await db.rpc(
        "try_reserve_connection_slot",
        { _connection_id: picked.connection_id },
      );
      const reservation = Array.isArray(reserveRes) ? reserveRes[0] : reserveRes;
      const slotReserved = reservation?.reserved === true;
      if (!slotReserved) {
        const backoffMs = reservation?.hour_full ? 15 * 60_000 : 60 * 60_000;
        await db
          .from("campaign_recipients")
          .update({
            status: "pending",
            next_send_at: new Date(Date.now() + backoffMs).toISOString(),
          })
          .eq("id", cand.id);
        result.skipped++;
        continue;
      }

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

      // F6.2: re-check de cooldown antes de mandar (defesa em profundidade).
      const cdHours = (c as { cooldown_value?: number | null }).cooldown_value ?? 0;
      const cdOn = (c as { cooldown_enabled?: boolean }).cooldown_enabled ?? true;
      if (cdOn && cdHours > 0) {
        const since = new Date(Date.now() - cdHours * 3600_000).toISOString();
        const digits = cand.contact_phone.replace(/\D/g, "");
        const variants = [cand.contact_phone, digits];
        if (digits.length === 10 || digits.length === 11) variants.push(`55${digits}`);
        if (digits.startsWith("55") && digits.length >= 12) variants.push(digits.slice(2));
        const { data: contactRow } = await db
          .from("contacts")
          .select("id")
          .eq("workspace_id", c.workspace_id)
            .in("phone", Array.from(new Set(variants)))
          .maybeSingle();
        if (contactRow?.id) {
          const { data: convs } = await db
            .from("conversations")
            .select("id")
            .eq("workspace_id", c.workspace_id)
            .eq("contact_id", contactRow.id);
          const convIds = (convs ?? []).map((x) => x.id);
          if (convIds.length > 0) {
            const { data: hit } = await db
              .from("messages")
              .select("id")
              .eq("workspace_id", c.workspace_id)
              .eq("direction", "inbound")
              .in("conversation_id", convIds)
              .gte("created_at", since)
              .limit(1)
              .maybeSingle();
            if (hit) {
              await db
                .from("campaign_recipients")
                .update({ status: "stopped_recent_reply" })
                .eq("id", cand.id);
              result.skipped++;
              continue; // nao consome cota
            }
          }
        }
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
        const sent = await provider.sendText(picked.instance_name, {
          to: normalizeMsisdn(cand.contact_phone),
          text,
        });
        await db
          .from("campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_connection_id: picked.connection_id,
          })
          .eq("id", cand.id);
        result.sent++;

        // C6: espelha na aba Conversas — upsert contact + conversation + message outbound.
        // Usa o mesmo external_id que o webhook (fromMe echo) usaria, para dedupe.
        try {
          await persistOutboundMessage(db, {
            workspaceId: c.workspace_id,
            connectionId: picked.connection_id,
            phone: normalizeMsisdn(cand.contact_phone),
            contactName: (cand as { contact_name?: string | null }).contact_name ?? null,
            text,
            providerMessageId: sent.providerMessageId,
          });
        } catch (persistErr) {
          console.error(
            "[dispatch] persist outbound failed:",
            persistErr instanceof Error ? persistErr.message.slice(0, 200) : "unknown",
          );
        }

        // Atualiza sent_today + sent_this_hour.
        const today = dateKeySaoPaulo(now);
        const newCount =
          c.sent_today_date === today ? c.sent_today + 1 : 1;
        sentThisHour += 1;
        await db
          .from("campaigns")
          .update({
            sent_today: newCount,
            sent_today_date: today,
            sent_this_hour: sentThisHour,
            sent_this_hour_at: currentHourKey,
          })
          .eq("id", c.id);
        c.sent_today = newCount;
        c.sent_today_date = today;
        c.sent_this_hour = sentThisHour;
        c.sent_this_hour_at = currentHourKey;
        remaining--;

        // F-antiban-conexao: cota GLOBAL ja foi incrementada atomicamente
        // via try_reserve_connection_slot antes do envio. Nada a fazer aqui.
      } catch (e) {
        // Libera a vaga reservada antes do envio (que falhou).
        try {
          await db.rpc("release_connection_slot", {
            _connection_id: picked.connection_id,
          });
        } catch {
          // best-effort; contadores tolerantes a leve overcount.
        }
        // F6.1: retry unico. attempt<1 -> reagenda; senao failed.
        const attempts = (cand.attempt_count ?? 0) + 1;
        const errMsg =
          e instanceof Error ? e.message.slice(0, 200) : "send_failed";
        if (attempts < 2) {
          const backoffMs = Math.max(c.min_ms, 30_000);
          await db
            .from("campaign_recipients")
            .update({
              status: "pending",
              attempt_count: attempts,
              error: errMsg,
              last_connection_id: picked.connection_id,
              next_send_at: new Date(Date.now() + backoffMs).toISOString(),
            })
            .eq("id", cand.id);
        } else {
          await db
            .from("campaign_recipients")
            .update({
              status: "failed",
              attempt_count: attempts,
              error: errMsg,
              last_connection_id: picked.connection_id,
            })
            .eq("id", cand.id);
          result.failed++;
        }
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
      .in("status", ["pending", "sending"]);
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

/**
 * Normaliza numero para formato aceito pela Evolution.
 * - remove tudo que nao for digito
 * - se tem 10 ou 11 digitos (BR sem DDI), prepend 55
 */
function normalizeMsisdn(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

async function persistOutboundMessage(
  db: Db,
  opts: {
    workspaceId: string;
    connectionId: string;
    phone: string;
    contactName: string | null;
    text: string;
    providerMessageId: string;
  },
): Promise<void> {
  // Upsert contato (mesma forma que o webhook grava).
  const { data: contact } = await db
    .from("contacts")
    .upsert(
      {
        workspace_id: opts.workspaceId,
        phone: opts.phone,
        ...(opts.contactName ? { name: opts.contactName } : {}),
      },
      { onConflict: "workspace_id,phone" },
    )
    .select("id")
    .single();
  if (!contact) return;

  // Localiza ou cria conversation escopada por (workspace, contact, connection).
  let conversationId: string | null = null;
  const { data: existing } = await db
    .from("conversations")
    .select("id")
    .eq("workspace_id", opts.workspaceId)
    .eq("contact_id", contact.id)
    .eq("connection_id", opts.connectionId)
    .maybeSingle();
  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: created } = await db
      .from("conversations")
      .insert({
        workspace_id: opts.workspaceId,
        contact_id: contact.id,
        connection_id: opts.connectionId,
        status: "open",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    conversationId = created?.id ?? null;
  }
  if (!conversationId) return;

  // Dedupe: se webhook (fromMe echo) ja gravou com o mesmo external_id, pula.
  const { data: dup } = await db
    .from("messages")
    .select("id")
    .eq("workspace_id", opts.workspaceId)
    .eq("conversation_id", conversationId)
    .eq("external_id", opts.providerMessageId)
    .maybeSingle();
  if (dup) return;

  await db.from("messages").insert({
    workspace_id: opts.workspaceId,
    conversation_id: conversationId,
    direction: "outbound",
    content: opts.text,
    status: "sent",
    external_id: opts.providerMessageId,
  });
  await db
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}