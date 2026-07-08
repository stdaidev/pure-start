import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server functions do modulo Conexoes (F2).
 *
 * - Sem auth v1: usam workspace default.
 * - EvolutionProvider e supabaseAdmin sao carregados dinamicamente dentro do handler
 *   (nunca no top-level de .functions.ts, senao vazam para bundle client).
 * - Nenhum log expoe apikey, QR base64 ou PII.
 */

export const createConnection = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ name: z.string().min(1).max(64) }).parse(raw),
  )
  .handler(async ({ data }) => {
    const workspaceId = "00000000-0000-0000-0000-000000000001";
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { evolutionProvider } = await import(
      "@/providers/channel/evolution.server"
    );
    const { getEvolutionWebhookDeliveryConfig } = await import(
      "@/lib/evolution-webhook.server"
    );

    const webhook = getEvolutionWebhookDeliveryConfig();

    // Cria linha em connections primeiro (pending) para termos id estavel
    const { data: row, error: insertErr } = await supabaseAdmin
      .from("connections")
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        provider: "evolution",
        status: "pending",
        instance_name: data.name,
        webhook_url: webhook.publicUrl,
      })
      .select("id, name")
      .single();

    if (insertErr || !row) {
      console.error("[connections] insert failed");
      throw new Error("Falha ao criar conexao");
    }

    try {
      const result = await evolutionProvider.createInstance({
        name: data.name,
        connectionId: row.id,
        webhookUrl: webhook.deliveryUrl,
        webhookHeaders: webhook.headers,
      });

      await supabaseAdmin
        .from("connections")
        .update({
          status: result.status.status,
          qr_code: result.qr?.base64 ?? null,
          instance_name: result.providerInstanceId,
        })
        .eq("id", row.id);

      return {
        id: row.id,
        status: result.status.status,
        qr: result.qr?.base64 ?? null,
      };
    } catch (err) {
      await supabaseAdmin
        .from("connections")
        .update({ status: "error" })
        .eq("id", row.id);
      console.error("[connections] evolution createInstance failed");
      throw new Error((err as Error).message || "Falha no provedor");
    }
  });

export const getConnectionStatus = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const workspaceId = "00000000-0000-0000-0000-000000000001";
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { evolutionProvider, configureEvolutionWebhook } = await import(
      "@/providers/channel/evolution.server"
    );
    const { getEvolutionWebhookDeliveryConfig } = await import(
      "@/lib/evolution-webhook.server"
    );

    const { data: row, error } = await supabaseAdmin
      .from("connections")
      .select("id, instance_name, status, qr_code, webhook_url")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Conexao nao encontrada");

    const instance = row.instance_name;
    if (!instance) throw new Error("Instancia sem nome");
    const webhook = getEvolutionWebhookDeliveryConfig();

    try {
      try {
        await configureEvolutionWebhook(instance, {
          webhookUrl: webhook.deliveryUrl,
          webhookHeaders: webhook.headers,
        });
        if (row.webhook_url !== webhook.publicUrl) {
          await supabaseAdmin
            .from("connections")
            .update({ webhook_url: webhook.publicUrl })
            .eq("id", row.id)
            .eq("workspace_id", workspaceId);
        }
      } catch {
        // Nao impede leitura de status se o provedor falhar ao reconfigurar webhook.
      }
      const status = await evolutionProvider.getStatus(instance);
      if (status.status !== row.status) {
        await supabaseAdmin
          .from("connections")
          .update({ status: status.status })
          .eq("id", row.id);
      }
      return { id: row.id, status: status.status, qr: row.qr_code };
    } catch {
      // Nao propaga erro externo para nao quebrar polling; devolve estado atual
      return { id: row.id, status: row.status ?? "pending", qr: row.qr_code };
    }
  });

export const refreshQr = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { evolutionProvider } = await import(
      "@/providers/channel/evolution.server"
    );

    const { data: row, error } = await supabaseAdmin
      .from("connections")
      .select("id, instance_name")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Conexao nao encontrada");

    if (!row.instance_name) throw new Error("Instancia sem nome");
    const qr = await evolutionProvider.getQrCode(row.instance_name);
    await supabaseAdmin
      .from("connections")
      .update({ qr_code: qr.base64, status: "qr" })
      .eq("id", row.id);

    return { id: row.id, qr: qr.base64 };
  });

export const deleteConnection = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { evolutionProvider } = await import(
      "@/providers/channel/evolution.server"
    );

    const { data: row, error } = await supabaseAdmin
      .from("connections")
      .select("id, instance_name")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Conexao nao encontrada");

    try {
      if (row.instance_name)
        await evolutionProvider.deleteInstance(row.instance_name);
    } catch {
      // segue mesmo se o Evolution ja tiver perdido a instancia
    }

    await supabaseAdmin.from("connections").delete().eq("id", row.id);
    return { id: row.id, deleted: true };
  });

export const listConnections = createServerFn({ method: "GET" }).handler(
  async () => {
    const workspaceId = "00000000-0000-0000-0000-000000000001";
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("connections")
      .select("id, name, status, default_agent_id, ignore_groups, updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Falha ao listar conexoes");
    return { connections: data ?? [] };
  },
);