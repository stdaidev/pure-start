import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";
import { renderTemplate } from "@/lib/template-render";

/**
 * F6 T2 - Server functions de Disparos.
 * - Workspace default (sem auth v1).
 * - supabaseAdmin importado dentro do handler.
 * - Nenhum log expoe telefone/rendered_text.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "canceled",
  "finished",
] as const;

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Canonicaliza para MSISDN (mesma forma que o webhook do Evolution grava
 * em `contacts.phone`). Sem esse alinhamento, cooldown e stop-on-reply nunca
 * casam com o contato criado pelo inbound.
 */
function toMsisdn(digits: string): string {
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function phoneVariants(digits: string): string[] {
  const canon = toMsisdn(digits);
  return canon === digits ? [digits] : [digits, canon];
}

function findPhoneKey(data: Record<string, unknown>): string | null {
  const candidates = ["phone", "telefone", "celular", "whatsapp", "numero"];
  const keys = Object.keys(data);
  for (const c of candidates) {
    const hit = keys.find((k) => k.trim().toLowerCase() === c);
    if (hit) return hit;
  }
  return null;
}

export const listCampaigns = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      data: rows,
      error,
      count,
    } = await supabaseAdmin
      .from("campaigns")
      .select(
        "id, name, status, connection_id, spreadsheet_id, template_id, created_at, started_at, finished_at, sent_today, daily_cap",
        { count: "exact" },
      )
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error("Falha ao listar campanhas");

    const ids = (rows ?? []).map((r) => r.id);
    const progress = new Map<
      string,
      { total: number; sent: number; failed: number; pending: number }
    >();
    if (ids.length) {
      const { data: recs, error: rErr } = await supabaseAdmin
        .from("campaign_recipients")
        .select("campaign_id, status")
        .in("campaign_id", ids);
      if (rErr) throw new Error("Falha ao consultar destinatarios");
      for (const r of recs ?? []) {
        const p = progress.get(r.campaign_id) ?? { total: 0, sent: 0, failed: 0, pending: 0 };
        p.total++;
        if (r.status === "sent") p.sent++;
        else if (r.status === "failed") p.failed++;
        else if (r.status === "pending") p.pending++;
        progress.set(r.campaign_id, p);
      }
    }

    return {
      campaigns: (rows ?? []).map((r) => ({
        ...r,
        progress: progress.get(r.id) ?? { total: 0, sent: 0, failed: 0, pending: 0 },
      })),
      total: count ?? 0,
    };
  });

export const getCampaign = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Falha ao carregar campanha");
    if (!row) throw new Error("Campanha nao encontrada");

    const { data: counts, error: cErr } = await supabaseAdmin
      .from("campaign_recipients")
      .select("status")
      .eq("campaign_id", data.id);
    if (cErr) throw new Error("Falha ao consultar destinatarios");
    const progress = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      skipped_optout: 0,
      stopped_reply: 0,
      stopped_recent_reply: 0,
    };
    for (const r of counts ?? []) {
      progress.total++;
      if (r.status === "sent") progress.sent++;
      else if (r.status === "failed") progress.failed++;
      else if (r.status === "pending" || r.status === "sending") progress.pending++;
      else if (r.status === "skipped_optout") progress.skipped_optout++;
      else if (r.status === "stopped_reply") progress.stopped_reply++;
      else if (r.status === "stopped_recent_reply") progress.stopped_recent_reply++;
    }
    return { campaign: row, progress };
  });

export const createCampaign = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        connection_id: z.string().uuid().optional(),
        connection_ids: z.array(z.string().uuid()).optional(),
        dispatch_mode: z.enum(["single", "multi"]).default("single"),
        spreadsheet_id: z.string().uuid(),
        template_text: z.string().min(1).max(4000),
        template_id: z.string().uuid().optional(),
        min_ms: z.number().int().min(0).max(600000).default(8000),
        max_ms: z.number().int().min(0).max(600000).default(20000),
        daily_cap: z.number().int().min(1).max(10000).default(200),
        hourly_limit: z.number().int().min(1).max(1000).default(60),
        window_start: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .default("09:00"),
        window_end: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .default("20:00"),
        warmup_per_day: z.number().int().min(1).max(10000).optional(),
        cooldown_enabled: z.boolean().default(true),
        cooldown_value: z.number().int().min(0).max(720).optional(),
        cooldown_unit: z.enum(["hours", "days"]).optional(),
      })
      .refine((v) => v.min_ms <= v.max_ms, {
        message: "min_ms deve ser <= max_ms",
      })
      .refine(
        (v) =>
          v.dispatch_mode === "single" ? !!v.connection_id : (v.connection_ids?.length ?? 0) >= 2,
        {
          message: "single requer connection_id; multi requer connection_ids com >=2",
        },
      )
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Carrega cooldown padrao do workspace.
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("cooldown_default_hours")
      .eq("id", DEFAULT_WORKSPACE)
      .maybeSingle();
    const defaultHours =
      (ws as { cooldown_default_hours?: number } | null)?.cooldown_default_hours ?? 24;
    const requestedHours = data.cooldown_value
      ? data.cooldown_unit === "days"
        ? data.cooldown_value * 24
        : data.cooldown_value
      : defaultHours;
    const effectiveHours = data.cooldown_enabled ? Math.max(defaultHours, requestedHours) : 0;

    // Le linhas da planilha.
    const { data: rows, error: rErr } = await supabaseAdmin
      .from("spreadsheet_rows")
      .select("row_index, data")
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("spreadsheet_id", data.spreadsheet_id)
      .order("row_index", { ascending: true });
    if (rErr) throw new Error("Falha ao ler planilha");
    if (!rows || rows.length === 0) throw new Error("Planilha vazia");

    // Coleta telefones e mapeia opt-out via contacts.
    const phones = new Set<string>();
    for (const r of rows) {
      const rowData = (r.data ?? {}) as Record<string, unknown>;
      const pk = findPhoneKey(rowData);
      if (!pk) continue;
      const phone = toMsisdn(normalizePhone(String(rowData[pk] ?? "")));
      if (phone.length >= 8) phones.add(phone);
    }
    const optOut = new Set<string>();
    if (phones.size) {
      // Busca por ambas as formas para tolerar contatos legados salvos sem DDI.
      const lookup = Array.from(new Set(Array.from(phones).flatMap(phoneVariants)));
      const { data: contacts, error: cErr } = await supabaseAdmin
        .from("contacts")
        .select("phone, opt_out")
        .eq("workspace_id", DEFAULT_WORKSPACE)
        .in("phone", lookup);
      if (cErr) throw new Error("Falha ao consultar contatos");
      for (const c of contacts ?? []) {
        if (c.opt_out) {
          optOut.add(c.phone);
          optOut.add(toMsisdn(c.phone));
        }
      }
    }

    // Cooldown: telefones que ja responderam dentro da janela efetiva.
    const inCooldown = new Set<string>();
    if (effectiveHours > 0 && phones.size) {
      const since = new Date(Date.now() - effectiveHours * 3600_000).toISOString();
      const lookup = Array.from(new Set(Array.from(phones).flatMap(phoneVariants)));
      // conversations -> contacts -> phone; cruza com os telefones da planilha.
      const { data: contactsForPhones } = await supabaseAdmin
        .from("contacts")
        .select("id, phone")
        .eq("workspace_id", DEFAULT_WORKSPACE)
        .in("phone", lookup);
      const phoneByContact = new Map<string, string>();
      for (const c of contactsForPhones ?? []) phoneByContact.set(c.id, toMsisdn(c.phone));
      const contactIds = Array.from(phoneByContact.keys());
      let convIds: string[] = [];
      const phoneByConv = new Map<string, string>();
      if (contactIds.length > 0) {
        const { data: convs } = await supabaseAdmin
          .from("conversations")
          .select("id, contact_id")
          .eq("workspace_id", DEFAULT_WORKSPACE)
          .in("contact_id", contactIds);
        for (const c of convs ?? []) {
          if (!c.contact_id) continue;
          const phone = phoneByContact.get(c.contact_id);
          if (phone) phoneByConv.set(c.id, phone);
        }
        convIds = Array.from(phoneByConv.keys());
      }
      if (convIds.length > 0) {
        const { data: msgs } = await supabaseAdmin
          .from("messages")
          .select("conversation_id, created_at, direction")
          .eq("workspace_id", DEFAULT_WORKSPACE)
          .eq("direction", "inbound")
          .in("conversation_id", convIds)
          .gte("created_at", since);
        for (const m of msgs ?? []) {
          const phone = phoneByConv.get(m.conversation_id);
          if (phone) inCooldown.add(phone);
        }
      }
    }

    // Valida as conexoes no workspace antes de criar qualquer estado parcial.
    const requestedConnectionIds =
      data.dispatch_mode === "single" ? [data.connection_id!] : (data.connection_ids ?? []);
    if (requestedConnectionIds.length) {
      const { data: conns } = await supabaseAdmin
        .from("connections")
        .select("id, status")
        .eq("workspace_id", DEFAULT_WORKSPACE)
        .in("id", requestedConnectionIds);
      if ((conns?.length ?? 0) !== requestedConnectionIds.length) {
        throw new Error("Uma ou mais conexoes invalidas para este workspace");
      }
      if ((conns ?? []).some((connection) => connection.status !== "connected")) {
        throw new Error("Todas as conexoes da campanha devem estar conectadas");
      }
    }

    // Cria campanha em draft.
    const insertCampaign: TablesInsert<"campaigns"> = {
      workspace_id: DEFAULT_WORKSPACE,
      name: data.name,
      // Em modo multi, connection_id fica null; conexoes vao em campaign_connections.
      connection_id: data.dispatch_mode === "single" ? (data.connection_id ?? null) : null,
      dispatch_mode: data.dispatch_mode,
      spreadsheet_id: data.spreadsheet_id,
      template_id: data.template_id ?? null,
      status: "draft",
      min_ms: data.min_ms,
      max_ms: data.max_ms,
      daily_cap: data.daily_cap,
      hourly_limit: data.hourly_limit,
      window_start: data.window_start,
      window_end: data.window_end,
      warmup_per_day: data.warmup_per_day ?? null,
      metadata: { template_text: data.template_text } as Json,
      ...({
        cooldown_enabled: data.cooldown_enabled,
        cooldown_value: effectiveHours,
        cooldown_unit: "hours",
      } as Partial<TablesInsert<"campaigns">>),
    };
    const { data: created, error: cErr } = await supabaseAdmin
      .from("campaigns")
      .insert(insertCampaign)
      .select("id")
      .single();
    if (cErr || !created) throw new Error("Falha ao criar campanha");

    const rollbackCampaign = async () => {
      const { error } = await supabaseAdmin
        .from("campaigns")
        .delete()
        .eq("workspace_id", DEFAULT_WORKSPACE)
        .eq("id", created.id);
      if (error) console.error("[campaigns] partial campaign cleanup failed", error.code);
    };

    // Registra conexoes vinculadas se modo multi.
    if (data.dispatch_mode === "multi" && data.connection_ids?.length) {
      const links = data.connection_ids.map((connection_id, position) => ({
        workspace_id: DEFAULT_WORKSPACE,
        campaign_id: created.id,
        connection_id,
        position,
      }));
      const { error: linkErr } = await supabaseAdmin.from("campaign_connections").insert(links);
      if (linkErr) {
        await rollbackCampaign();
        throw new Error("Falha ao vincular conexoes");
      }
    }

    // Renderiza recipients.
    // Semeia next_send_at escalonado para evitar rajada no primeiro tick.
    const avgMs = Math.max(1000, Math.round((data.min_ms + data.max_ms) / 2));
    const t0 = Date.now();
    let idx = 0;
    const recipients: TablesInsert<"campaign_recipients">[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const rowData = (r.data ?? {}) as Record<string, unknown>;
      const pk = findPhoneKey(rowData);
      if (!pk) continue;
      const phone = toMsisdn(normalizePhone(String(rowData[pk] ?? "")));
      if (phone.length < 8) continue;
      if (seen.has(phone)) continue; // deduplica dentro da mesma planilha
      seen.add(phone);
      const nameKey = Object.keys(rowData).find((k) =>
        ["name", "nome"].includes(k.trim().toLowerCase()),
      );
      const contactName = nameKey ? String(rowData[nameKey] ?? "") : null;
      const { text } = renderTemplate(data.template_text, rowData);
      const isOptOut = optOut.has(phone);
      const isCooldown = !isOptOut && inCooldown.has(phone);
      const statusValue = isOptOut
        ? "skipped_optout"
        : isCooldown
          ? "stopped_recent_reply"
          : "pending";
      recipients.push({
        workspace_id: DEFAULT_WORKSPACE,
        campaign_id: created.id,
        contact_phone: phone,
        contact_name: contactName,
        variables: { rendered_text: text } as Json,
        status: statusValue,
        next_send_at: isOptOut || isCooldown ? null : new Date(t0 + idx * avgMs).toISOString(),
      });
      if (!isOptOut && !isCooldown) idx++;
    }

    if (recipients.length === 0) {
      await rollbackCampaign();
      throw new Error("Nenhum destinatario valido encontrado na planilha");
    }

    let inserted = 0;
    const batch = 500;
    for (let i = 0; i < recipients.length; i += batch) {
      const slice = recipients.slice(i, i + batch);
      const { error: iErr } = await supabaseAdmin.from("campaign_recipients").insert(slice);
      if (iErr) {
        await rollbackCampaign();
        throw new Error("Falha ao inserir destinatarios");
      }
      inserted += slice.length;
    }

    return {
      id: created.id,
      recipients_created: inserted,
      opt_outs_skipped: recipients.filter((r) => r.status === "skipped_optout").length,
      cooldown_skipped: recipients.filter((r) => r.status === "stopped_recent_reply").length,
    };
  });

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(CAMPAIGN_STATUSES),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: TablesUpdate<"campaigns"> = { status: data.status };
    if (data.status === "running") patch.started_at = new Date().toISOString();
    if (data.status === "finished" || data.status === "canceled") {
      patch.finished_at = new Date().toISOString();
    }
    const { error } = await supabaseAdmin
      .from("campaigns")
      .update(patch)
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("id", data.id);
    if (error) throw new Error("Falha ao atualizar status");
    return { ok: true };
  });

export const listRecipients = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        campaign_id: z.string().uuid(),
        status: z
          .enum([
            "pending",
            "sending",
            "sent",
            "failed",
            "skipped_optout",
            "stopped_reply",
            "stopped_recent_reply",
          ])
          .optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("campaign_recipients")
      .select(
        "id, contact_phone, contact_name, status, sent_at, error, updated_at, last_connection_id, attempt_count",
        { count: "exact" },
      )
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("campaign_id", data.campaign_id)
      .order("updated_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error, count } = await q;
    if (error) throw new Error("Falha ao listar destinatarios");
    return { recipients: rows ?? [], total: count ?? 0 };
  });

export const listSpreadsheets = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("spreadsheets")
    .select("id, name, headers, row_count, updated_at")
    .eq("workspace_id", DEFAULT_WORKSPACE)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Falha ao listar planilhas");
  return { spreadsheets: data ?? [] };
});

export const getSpreadsheetPreview = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ spreadsheet_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sheet, error: sErr } = await supabaseAdmin
      .from("spreadsheets")
      .select("id, name, headers, row_count")
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("id", data.spreadsheet_id)
      .maybeSingle();
    if (sErr) throw new Error("Falha ao carregar planilha");
    if (!sheet) throw new Error("Planilha nao encontrada");
    const { data: rows, error: rErr } = await supabaseAdmin
      .from("spreadsheet_rows")
      .select("row_index, data")
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("spreadsheet_id", data.spreadsheet_id)
      .order("row_index", { ascending: true })
      .limit(1);
    if (rErr) throw new Error("Falha ao carregar amostra");
    const first = (rows?.[0]?.data ?? null) as Json | null;
    return { sheet, first_row: first };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: rErr } = await supabaseAdmin
      .from("campaign_recipients")
      .delete()
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("campaign_id", data.id);
    if (rErr) throw new Error("Falha ao remover destinatarios");
    const { error: cErr } = await supabaseAdmin
      .from("campaigns")
      .delete()
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("id", data.id);
    if (cErr) throw new Error("Falha ao remover campanha");
    return { ok: true };
  });

export const getCampaignConnections = createServerFn({ method: "POST" })
  .validator((raw: unknown) => z.object({ campaign_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("campaign_connections")
      .select("connection_id, position, connections(id, name, status, instance_name)")
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("campaign_id", data.campaign_id)
      .order("position", { ascending: true });
    if (error) throw new Error("Falha ao listar conexoes da campanha");
    return { connections: rows ?? [] };
  });
