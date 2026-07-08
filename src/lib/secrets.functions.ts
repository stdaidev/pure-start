import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * F7 T2 - Server fns para gerenciar secrets de provedores.
 *
 * REGRAS DE SEGURANCA:
 * - `listProviderSecrets` NUNCA retorna o valor bruto — apenas
 *   `{ name, configured, masked }`.
 * - `upsertProviderSecret` recebe valor, salva e devolve so a mascara.
 * - Toda I/O ocorre via `supabaseAdmin` (service_role) dentro do handler.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

export const PROVIDER_SECRET_NAMES = [
  "EVOLUTION_BASE_URL",
  "EVOLUTION_API_KEY",
  "OPENAI_API_KEY",
  "ELEVENLABS_API_KEY",
] as const;

export type ProviderSecretName = (typeof PROVIDER_SECRET_NAMES)[number];

function maskValue(value: string): string {
  if (!value) return "";
  const tail = value.slice(-4);
  return `****${tail}`;
}

export const listProviderSecrets = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("workspace_secrets")
      .select("name, value, updated_at")
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao listar secrets");

    const byName = new Map<string, { value: string; updated_at: string }>();
    for (const row of (data ?? []) as Array<{
      name: string;
      value: string;
      updated_at: string;
    }>) {
      byName.set(row.name, { value: row.value, updated_at: row.updated_at });
    }

    return PROVIDER_SECRET_NAMES.map((name) => {
      const row = byName.get(name);
      const envFallback = Boolean(process.env[name]);
      const configured = Boolean(row?.value) || envFallback;
      return {
        name,
        configured,
        source: row?.value ? "db" : envFallback ? "env" : "none",
        masked: row?.value ? maskValue(row.value) : envFallback ? "****env" : "",
        updated_at: row?.updated_at ?? null,
      } as const;
    });
  },
);

export const upsertProviderSecret = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        name: z.enum(PROVIDER_SECRET_NAMES),
        value: z.string().min(1).max(4000),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { invalidateSecretCache } = await import("./secrets.server");

    const { error } = await supabaseAdmin
      .from("workspace_secrets")
      .upsert(
        {
          workspace_id: DEFAULT_WORKSPACE,
          name: data.name,
          value: data.value,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "workspace_id,name" },
      );
    if (error) throw new Error("Falha ao salvar secret");

    invalidateSecretCache(data.name, DEFAULT_WORKSPACE);

    return {
      ok: true,
      name: data.name,
      configured: true,
      masked: maskValue(data.value),
    };
  });

export const deleteProviderSecret = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ name: z.enum(PROVIDER_SECRET_NAMES) }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { invalidateSecretCache } = await import("./secrets.server");
    const { error } = await supabaseAdmin
      .from("workspace_secrets")
      .delete()
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("name", data.name);
    if (error) throw new Error("Falha ao remover secret");
    invalidateSecretCache(data.name, DEFAULT_WORKSPACE);
    return { ok: true, name: data.name };
  });