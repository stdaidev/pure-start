import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";

/**
 * F5 - Contatos e Planilhas.
 * - Workspace default (sem auth v1).
 * - supabaseAdmin importado dentro do handler.
 * - Nenhum log expoe telefone/email/nome.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

export const listContacts = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        query: z.string().max(200).optional().default(""),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    let q = supabaseAdmin
      .from("contacts")
      .select("id, name, phone, email, tags, opt_out, metadata, updated_at", {
        count: "exact",
      })
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .order("updated_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.query.trim()) {
      const term = data.query.trim().replace(/[%_]/g, "");
      q = q.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    const { data: rows, error, count } = await q;
    if (error) throw new Error("Falha ao listar contatos");
    return { contacts: rows ?? [], total: count ?? 0 };
  });

export const updateContact = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().max(200).nullable().optional(),
        tags: z.array(z.string().max(60)).max(50).optional(),
        opt_out: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const patch: TablesUpdate<"contacts"> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.opt_out !== undefined) patch.opt_out = data.opt_out;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("contacts")
      .update(patch)
      .eq("id", data.id)
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao atualizar contato");
    return { ok: true };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("contacts")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao remover contato");
    return { ok: true };
  });

const importRow = z.object({
  phone: z.string().min(8).max(20),
  name: z.string().max(200).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(60)).max(50).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const importContacts = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        rows: z.array(importRow).min(1).max(10000),
        spreadsheet: z
          .object({
            name: z.string().min(1).max(200),
            headers: z.array(z.string().max(120)).min(1).max(200),
            rawRows: z
              .array(z.record(z.string(), z.string()))
              .min(1)
              .max(10000),
          })
          .optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Dedupe por phone dentro do payload (mantem ultima ocorrencia).
    const byPhone = new Map<string, z.infer<typeof importRow>>();
    for (const r of data.rows) byPhone.set(r.phone, r);
    const uniques = Array.from(byPhone.values());

    // Busca existentes para preservar opt_out e mesclar metadata.
    const phones = uniques.map((r) => r.phone);
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("contacts")
      .select("phone, opt_out, metadata, tags")
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .in("phone", phones);
    if (exErr) throw new Error("Falha ao consultar contatos existentes");

    const existingMap = new Map<
      string,
      { opt_out: boolean; metadata: Record<string, unknown>; tags: string[] }
    >();
    for (const e of existing ?? []) {
      existingMap.set(e.phone, {
        opt_out: e.opt_out,
        metadata: (e.metadata ?? {}) as Record<string, unknown>,
        tags: e.tags ?? [],
      });
    }

    const payload: TablesInsert<"contacts">[] = uniques.map((r) => {
      const prev = existingMap.get(r.phone);
      const mergedMetadata = { ...(prev?.metadata ?? {}), ...(r.metadata ?? {}) };
      const mergedTags = Array.from(
        new Set([...(prev?.tags ?? []), ...(r.tags ?? [])]),
      );
      return {
        workspace_id: DEFAULT_WORKSPACE,
        phone: r.phone,
        name: r.name ?? null,
        email: r.email ?? null,
        tags: mergedTags,
        metadata: mergedMetadata as Json,
        opt_out: prev?.opt_out ?? false,
      };
    });

    let created = 0;
    let updated = 0;
    const optOutsPreserved = payload.filter((p) => p.opt_out).length;
    const batchSize = 200;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const { error } = await supabaseAdmin
        .from("contacts")
        .upsert(batch, { onConflict: "workspace_id,phone" });
      if (error) throw new Error("Falha ao importar lote");
      for (const b of batch) {
        if (existingMap.has(b.phone)) updated++;
        else created++;
      }
    }

    return {
      created,
      updated,
      opt_outs_preserved: optOutsPreserved,
      total: payload.length,
      spreadsheet_id: await maybeCreateSpreadsheet(
        supabaseAdmin,
        data.spreadsheet,
      ),
    };
  });

async function maybeCreateSpreadsheet(
  db: Awaited<
    ReturnType<typeof import("@/integrations/supabase/client.server")>
  > extends never
    ? never
    : import("@supabase/supabase-js").SupabaseClient,
  sheet:
    | {
        name: string;
        headers: string[];
        rawRows: Record<string, string>[];
      }
    | undefined,
): Promise<string | null> {
  if (!sheet) return null;
  const { data: created, error } = await db
    .from("spreadsheets")
    .insert({
      workspace_id: DEFAULT_WORKSPACE,
      name: sheet.name,
      headers: sheet.headers,
      row_count: sheet.rawRows.length,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error("Falha ao salvar planilha");
  const rowsPayload = sheet.rawRows.map((r, i) => ({
    workspace_id: DEFAULT_WORKSPACE,
    spreadsheet_id: created.id,
    row_index: i,
    data: r as unknown as Json,
  }));
  const batchSize = 500;
  for (let i = 0; i < rowsPayload.length; i += batchSize) {
    const { error: rErr } = await db
      .from("spreadsheet_rows")
      .insert(rowsPayload.slice(i, i + batchSize));
    if (rErr) throw new Error("Falha ao salvar linhas da planilha");
  }
  return created.id;
}