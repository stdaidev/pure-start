import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * F6.1 T3 - Selecao de conexao para uma campanha.
 * - single: usa `campaigns.connection_id`.
 * - multi: round-robin baseado no ultimo `last_connection_id` gravado nos
 *   recipients enviados, pulando conexoes desconectadas.
 */

type Db = SupabaseClient<Database>;

export type PickedConnection = {
  connection_id: string;
  instance_name: string;
};

export async function pickConnection(
  db: Db,
  campaign: {
    id: string;
    workspace_id: string;
    connection_id: string | null;
    dispatch_mode: string;
  },
): Promise<PickedConnection | null> {
  if (campaign.dispatch_mode !== "multi") {
    if (!campaign.connection_id) return null;
    const { data: c } = await db
      .from("connections")
      .select("id, instance_name, status")
      .eq("id", campaign.connection_id)
      .maybeSingle();
    if (!c?.instance_name) return null;
    return { connection_id: c.id, instance_name: c.instance_name };
  }

  // multi: carrega vinculos ordenados por position
  const { data: links } = await db
    .from("campaign_connections")
    .select("connection_id, position, connections(id, instance_name, status)")
    .eq("campaign_id", campaign.id)
    .order("position", { ascending: true });
  const candidates =
    (links ?? [])
      .map((l) => l.connections)
      .filter(
        (c): c is { id: string; instance_name: string; status: string } =>
          !!c && !!c.instance_name && c.status === "connected",
      );
  if (candidates.length === 0) {
    // Fallback: aceita qualquer instancia vinculada com instance_name (mesmo sem status connected)
    const fallback = (links ?? [])
      .map((l) => l.connections)
      .filter(
        (c): c is { id: string; instance_name: string; status: string } =>
          !!c && !!c.instance_name,
      );
    if (fallback.length === 0) return null;
    candidates.push(...fallback);
  }

  // Ultimo enviado -> proximo na lista
  const { data: lastSent } = await db
    .from("campaign_recipients")
    .select("last_connection_id")
    .eq("campaign_id", campaign.id)
    .not("last_connection_id", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let startIdx = 0;
  if (lastSent?.last_connection_id) {
    const idx = candidates.findIndex(
      (c) => c.id === lastSent.last_connection_id,
    );
    if (idx >= 0) startIdx = (idx + 1) % candidates.length;
  }
  const chosen = candidates[startIdx] ?? candidates[0];
  return { connection_id: chosen.id, instance_name: chosen.instance_name };
}