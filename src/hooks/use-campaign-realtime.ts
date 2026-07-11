import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * F6 T7 - Realtime em `campaign_recipients` e `campaigns` para uma campanha.
 */
export function useCampaignRealtime(campaignId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`f6-campaign-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_recipients",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
          qc.invalidateQueries({ queryKey: ["recipients", campaignId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaignId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, campaignId]);
}
