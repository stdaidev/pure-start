import { createServerFn } from "@tanstack/react-start";

/**
 * F7 T5 - Sumario para o dashboard.
 * Retorna KPIs agregados + ultimas 5 campanhas do workspace default.
 */

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

export interface DashboardSummary {
  connections_connected: number;
  campaigns_running: number;
  messages_today: { in: number; out: number };
  replies_today: number;
  pipeline: {
    open_value_cents: number;
    won_value_cents: number;
    top_tags: Array<{ tag: string; count: number }>;
  };
  last_campaigns: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    sent: number;
    total: number;
  }>;
}

export const getDashboardSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardSummary> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    const ws = DEFAULT_WORKSPACE;

    const [
      connsRes,
      campsRunningRes,
      msgsInRes,
      msgsOutRes,
      lastCampsRes,
      crmRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws)
        .eq("status", "connected"),
      supabaseAdmin
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws)
        .eq("status", "running"),
      supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws)
        .eq("direction", "inbound")
        .gte("created_at", startIso),
      supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ws)
        .eq("direction", "outbound")
        .gte("created_at", startIso),
      supabaseAdmin
        .from("campaigns")
        .select("id, name, status, created_at")
        .eq("workspace_id", ws)
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("conversations")
        .select("tags, lead_value_cents, lead_outcome, status")
        .eq("workspace_id", ws)
        .not("lead_value_cents", "is", null),
    ]);

    const lastCampaigns = (lastCampsRes.data ?? []) as Array<{
      id: string;
      name: string;
      status: string;
      created_at: string;
    }>;

    // Para cada campanha, contar recipients (total) e enviados (sent).
    const enriched = await Promise.all(
      lastCampaigns.map(async (c) => {
        const [totalRes, sentRes] = await Promise.all([
          supabaseAdmin
            .from("campaign_recipients")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", c.id),
          supabaseAdmin
            .from("campaign_recipients")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", c.id)
            .eq("status", "sent"),
        ]);
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          created_at: c.created_at,
          total: totalRes.count ?? 0,
          sent: sentRes.count ?? 0,
        };
      }),
    );

    const crmRows = (crmRes.data ?? []) as Array<{
      tags: string[] | null;
      lead_value_cents: number | null;
      lead_outcome: "won" | "lost" | null;
      status: string | null;
    }>;
    let openValue = 0;
    let wonValue = 0;
    const tagCounts = new Map<string, number>();
    for (const r of crmRows) {
      if (r.lead_outcome === "won") wonValue += r.lead_value_cents ?? 0;
      else if (r.lead_outcome !== "lost" && r.status !== "closed")
        openValue += r.lead_value_cents ?? 0;
      for (const t of r.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      connections_connected: connsRes.count ?? 0,
      campaigns_running: campsRunningRes.count ?? 0,
      messages_today: {
        in: msgsInRes.count ?? 0,
        out: msgsOutRes.count ?? 0,
      },
      replies_today: msgsInRes.count ?? 0,
      pipeline: {
        open_value_cents: openValue,
        won_value_cents: wonValue,
        top_tags: topTags,
      },
      last_campaigns: enriched,
    };
  },
);