import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server functions do modulo Agentes (F3).
 *
 * - Sem auth v1: workspace default.
 * - supabaseAdmin carregado dentro do handler (nunca top-level em .functions.ts).
 * - Nenhum log expoe system_prompt ou conteudo.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

const humanizationSchema = z.object({
  chunk: z.boolean().default(true),
  min_ms: z.number().int().min(0).max(20_000).default(800),
  max_ms: z.number().int().min(0).max(20_000).default(3500),
});

const agentInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  model: z.string().min(1).max(80),
  temperature: z.number().min(0).max(2),
  system_prompt: z.string().max(20_000).default(""),
  tools: z.array(z.string().min(1).max(60)).max(20).default([]),
  humanization: humanizationSchema.default({
    chunk: true,
    min_ms: 800,
    max_ms: 3500,
  }),
  voice_id: z.string().max(120).optional().nullable(),
  active: z.boolean().default(true),
});

export const listAgents = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin
    .from("agents")
    .select(
      "id, name, description, model, temperature, active, tools, humanization, updated_at",
    )
    .eq("workspace_id", DEFAULT_WORKSPACE)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Falha ao listar agentes");
  return { agents: data ?? [] };
});

export const getAgent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error } = await supabaseAdmin
      .from("agents")
      .select("*")
      .eq("id", data.id)
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .maybeSingle();
    if (error) throw new Error("Falha ao carregar agente");
    if (!row) throw new Error("Agente nao encontrado");
    return row;
  });

export const saveAgent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => agentInputSchema.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const payload = {
      workspace_id: DEFAULT_WORKSPACE,
      name: data.name,
      description: data.description ?? null,
      model: data.model,
      temperature: data.temperature,
      system_prompt: data.system_prompt,
      tools: data.tools,
      humanization: data.humanization,
      voice_id: data.voice_id ?? null,
      active: data.active,
    };

    if (data.id) {
      const { data: row, error } = await supabaseAdmin
        .from("agents")
        .update(payload)
        .eq("id", data.id)
        .eq("workspace_id", DEFAULT_WORKSPACE)
        .select("id")
        .single();
      if (error || !row) throw new Error("Falha ao salvar agente");
      return { id: row.id };
    }

    const { data: row, error } = await supabaseAdmin
      .from("agents")
      .insert(payload)
      .select("id")
      .single();
    if (error || !row) throw new Error("Falha ao criar agente");
    return { id: row.id };
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("agents")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao deletar agente");
    return { id: data.id, deleted: true };
  });

export const toggleAgent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("agents")
      .update({ active: data.active })
      .eq("id", data.id)
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao atualizar agente");
    return { id: data.id, active: data.active };
  });

export const setConnectionAgent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        connectionId: z.string().uuid(),
        agentId: z.string().uuid().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("connections")
      .update({ default_agent_id: data.agentId })
      .eq("id", data.connectionId)
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao vincular agente");
    return { connectionId: data.connectionId, agentId: data.agentId };
  });

export const setConnectionIgnoreGroups = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        connectionId: z.string().uuid(),
        ignoreGroups: z.boolean(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error: readErr } = await supabaseAdmin
      .from("connections")
      .select("instance_name")
      .eq("id", data.connectionId)
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .maybeSingle();
    if (readErr || !row) throw new Error("Conexao nao encontrada");

    const { error } = await supabaseAdmin
      .from("connections")
      .update({ ignore_groups: data.ignoreGroups })
      .eq("id", data.connectionId)
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao atualizar conexao");

    // Sync com Evolution (best-effort; nao bloqueia update local)
    if (row.instance_name) {
      try {
        const { evolutionProvider } = await import(
          "@/providers/channel/evolution.server"
        );
        await evolutionProvider.setSettings?.(row.instance_name, {
          groupsIgnore: data.ignoreGroups,
        });
      } catch (err) {
        console.error("[connections] setSettings groups_ignore falhou", err);
      }
    }

    return { connectionId: data.connectionId, ignoreGroups: data.ignoreGroups };
  });