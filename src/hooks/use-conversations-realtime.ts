import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000001";

/**
 * Assina Supabase Realtime em `messages` para invalidar as queries
 * da inbox quando novas linhas entrarem.
 */
export function useConversationsRealtime(activeConversationId?: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("f4-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `workspace_id=eq.${DEFAULT_WORKSPACE}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["conversations"] });
          const cid =
            (payload.new as { conversation_id?: string } | null)
              ?.conversation_id ??
            (payload.old as { conversation_id?: string } | null)
              ?.conversation_id;
          if (cid) {
            qc.invalidateQueries({ queryKey: ["messages", cid] });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `workspace_id=eq.${DEFAULT_WORKSPACE}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, activeConversationId]);
}