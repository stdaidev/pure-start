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
  .inputValidator((raw: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: rows, error, count } = await supabaseAdmin
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
        const p =
          progress.get(r.campaign_id) ??
          { total: 0, sent: 0, failed: 0, pending: 0 };
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
        progress:
          progress.get(r.id) ?? { total: 0, sent: 0, failed: 0, pending: 0 },
      })),
      total: count ?? 0,
    };
  });

export const getCampaign = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
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
    const progress = { total: 0, sent: 0, failed: 0, pending: 0, skipped_optout: 0 };
    for (const r of counts ?? []) {
      progress.total++;
      if (r.status === "sent") progress.sent++;
      else if (r.status === "failed") progress.failed++;
      else if (r.status === "pending") progress.pending++;
      else if (r.status === "skipped_optout") progress.skipped_optout++;
    }
    return { campaign: row, progress };
  });

export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        connection_id: z.string().uuid(),
        spreadsheet_id: z.string().uuid(),
        template_text: z.string().min(1).max(4000),
        template_id: z.string().uuid().optional(),
        min_ms: z.number().int().min(0).max(600000).default(8000),
        max_ms: z.number().int().min(0).max(600000).default(20000),
        daily_cap: z.number().int().min(1).max(10000).default(200),
        window_start: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .default("09:00"),
        window_end: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .default("20:00"),
        warmup_per_day: z.number().int().min(1).max(10000).optional(),
      })
      .refine((v) => v.min_ms <= v.max_ms, {
        message: "min_ms deve ser <= max_ms",
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

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
      const phone = normalizePhone(String(rowData[pk] ?? ""));
      if (phone.length >= 8) phones.add(phone);
    }
    const optOut = new Set<string>();
    if (phones.size) {
      const { data: contacts, error: cErr } = await supabaseAdmin
        .from("contacts")
        .select("phone, opt_out")
        .eq("workspace_id", DEFAULT_WORKSPACE)
        .in("phone", Array.from(phones));
      if (cErr) throw new Error("Falha ao consultar contatos");
      for (const c of contacts ?? []) {
        if (c.opt_out) optOut.add(c.phone);
      }
    }

    // Cria campanha em draft.
    const insertCampaign: TablesInsert<"campaigns"> = {
      workspace_id: DEFAULT_WORKSPACE,
      name: data.name,
      connection_id: data.connection_id,
      spreadsheet_id: data.spreadsheet_id,
      template_id: data.template_id ?? null,
      status: "draft",
      min_ms: data.min_ms,
      max_ms: data.max_ms,
      daily_cap: data.daily_cap,
      window_start: data.window_start,
      window_end: data.window_end,
      warmup_per_day: data.warmup_per_day ?? null,
      metadata: { template_text: data.template_text } as Json,
    };
    const { data: created, error: cErr } = await supabaseAdmin
      .from("campaigns")
      .insert(insertCampaign)
      .select("id")
      .single();
    if (cErr || !created) throw new Error("Falha ao criar campanha");

    // Renderiza recipients.
    const recipients: TablesInsert<"campaign_recipients">[] = [];
    for (const r of rows) {
      const rowData = (r.data ?? {}) as Record<string, unknown>;
      const pk = findPhoneKey(rowData);
      if (!pk) continue;
      const phone = normalizePhone(String(rowData[pk] ?? ""));
      if (phone.length < 8) continue;
      const nameKey = Object.keys(rowData).find((k) =>
        ["name", "nome"].includes(k.trim().toLowerCase()),
      );
      const contactName = nameKey ? String(rowData[nameKey] ?? "") : null;
      const { text } = renderTemplate(data.template_text, rowData);
      recipients.push({
        workspace_id: DEFAULT_WORKSPACE,
        campaign_id: created.id,
        contact_phone: phone,
        contact_name: contactName,
        variables: { rendered_text: text } as Json,
        status: optOut.has(phone) ? "skipped_optout" : "pending",
      });
    }

    let inserted = 0;
    const batch = 500;
    for (let i = 0; i < recipients.length; i += batch) {
      const slice = recipients.slice(i, i + batch);
      const { error: iErr } = await supabaseAdmin
        .from("campaign_recipients")
        .insert(slice);
      if (iErr) throw new Error("Falha ao inserir destinatarios");
      inserted += slice.length;
    }

    return {
      id: created.id,
      recipients_created: inserted,
      opt_outs_skipped: recipients.filter((r) => r.status === "skipped_optout")
        .length,
    };
  });

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(CAMPAIGN_STATUSES),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
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
  .inputValidator((raw: unknown) =>
    z
      .object({
        campaign_id: z.string().uuid(),
        status: z.enum(["pending", "sent", "failed", "skipped_optout"]).optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    let q = supabaseAdmin
      .from("campaign_recipients")
      .select(
        "id, contact_phone, contact_name, status, sent_at, error, updated_at",
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