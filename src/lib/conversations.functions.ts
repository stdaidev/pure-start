import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server functions do modulo Conversas (F4).
 *
 * - Sem auth v1: workspace default.
 * - supabaseAdmin / EvolutionProvider carregados dentro do handler.
 * - Nenhum log expoe content de mensagem.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

export const listConversations = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select(
        "id, agent_id, assigned_to, connection_id, contact_id, status, last_message_at, contacts(name, phone), connections(name), agents(name)",
      )
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw new Error("Falha ao listar conversas");

    // last message preview
    const ids = (data ?? []).map((c) => c.id);
    let previews = new Map<string, { content: string | null; created_at: string; direction: string; media_type: string | null }>();
    if (ids.length > 0) {
      const { data: msgs } = await supabaseAdmin
        .from("messages")
        .select("conversation_id, content, created_at, direction, media_type")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(500);
      for (const m of msgs ?? []) {
        if (!previews.has(m.conversation_id)) {
          previews.set(m.conversation_id, {
            content: m.content,
            created_at: m.created_at,
            direction: m.direction,
            media_type: m.media_type,
          });
        }
      }
    }

    return {
      conversations: (data ?? []).map((c) => ({
        id: c.id,
        agent_id: c.agent_id,
        assigned_to: c.assigned_to,
        status: c.status,
        last_message_at: c.last_message_at,
        contact_name: c.contacts?.name ?? null,
        contact_phone: c.contacts?.phone ?? "",
        connection_id: c.connection_id,
        connection_name: c.connections?.name ?? null,
        agent_name: c.agents?.name ?? null,
        preview: previews.get(c.id) ?? null,
      })),
    };
  },
);

export const getMessages = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: rows, error } = await supabaseAdmin
      .from("messages")
      .select("id, direction, content, media_url, media_type, status, created_at, external_id")
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error("Falha ao carregar mensagens");
    return { messages: rows ?? [] };
  });

export const assignConversation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        to: z.union([z.literal("human"), z.null()]),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("conversations")
      .update({ assigned_to: data.to })
      .eq("id", data.id)
      .eq("workspace_id", DEFAULT_WORKSPACE);
    if (error) throw new Error("Falha ao atualizar handoff");
    return { ok: true };
  });

export const sendConversationMessage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        text: z.string().min(1).max(4000),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { evolutionProvider } = await import(
      "@/providers/channel/evolution.server"
    );

    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select(
        "id, assigned_to, connection_id, contact_id, contacts(phone), connections(instance_name)",
      )
      .eq("id", data.conversationId)
      .eq("workspace_id", DEFAULT_WORKSPACE)
      .maybeSingle();
    if (convErr || !conv) throw new Error("Conversa nao encontrada");
    if (!conv.assigned_to) {
      throw new Error("Assuma a conversa antes de enviar");
    }
    const phone = conv.contacts?.phone;
    const instance = conv.connections?.instance_name;
    if (!phone || !instance) throw new Error("Conexao ou contato invalido");

    const sent = await evolutionProvider.sendText(instance, {
      to: phone,
      text: data.text,
    });

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("messages")
      .insert({
        workspace_id: DEFAULT_WORKSPACE,
        conversation_id: conv.id,
        direction: "outbound",
        content: data.text,
        status: "sent",
        external_id: sent.providerMessageId,
      })
      .select("id")
      .single();
    if (insertErr) throw new Error("Falha ao registrar mensagem");

    await supabaseAdmin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conv.id);

    return { id: inserted.id };
  });