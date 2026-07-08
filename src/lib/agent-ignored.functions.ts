import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { normalizePhone } from "@/lib/phone";

/**
 * F9 - Blocklist de numeros que o agente deve ignorar.
 *
 * Mesma cerimonia dos demais modulos: workspace default, supabaseAdmin
 * carregado dentro do handler, sem PII em log.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

export const listIgnoredNumbers = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("agent_ignored_numbers")
      .select("id, phone_e164, label, created_at")
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Falha ao listar numeros ignorados");
    return { items: data ?? [] };
  },
);

export const addIgnoredNumber = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        phone: z.string().min(3).max(40),
        label: z.string().max(120).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Telefone invalido");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error } = await supabaseAdmin
      .from("agent_ignored_numbers")
      .upsert(
        {
          workspace_id: DEFAULT_WORKSPACE,
          phone_e164: phone,
          label: data.label?.trim() || null,
        },
        { onConflict: "workspace_id,phone_e164" },
      )
      .select("id")
      .single();
    if (error || !row) throw new Error("Falha ao adicionar numero");
    return { id: row.id, phone_e164: phone };
  });

export const removeIgnoredNumber = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("agent_ignored_numbers")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao remover numero");
    return { id: data.id, deleted: true };
  });