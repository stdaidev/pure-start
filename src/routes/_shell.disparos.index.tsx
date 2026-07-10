import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CampaignList, type CampaignRow } from "@/components/disparos/campaign-list";
import { NewCampaignDialog } from "@/components/disparos/new-campaign-dialog";
import { deleteCampaign, listCampaigns } from "@/lib/campaigns.functions";

export const Route = createFileRoute("/_shell/disparos/")({
  head: () => ({
    meta: [
      { title: "Disparos // HUD" },
      { name: "description", content: "Campanhas com anti-ban e monitor." },
    ],
  }),
  component: DisparosPage,
});

function DisparosPage() {
  const listFn = useServerFn(listCampaigns);
  const deleteFn = useServerFn(deleteCampaign);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: () => listFn({ data: { limit: 50, offset: 0 } }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Campanha excluida");
      qc.invalidateQueries({ queryKey: ["campaigns", "list"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao excluir"),
  });

  const campaigns: CampaignRow[] = (q.data?.campaigns ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    connection_id: c.connection_id,
    created_at: c.created_at,
    progress: c.progress,
  }));

  return (
    <div className="flex h-full w-full flex-col gap-4 p-6">
      <header className="flex items-start justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            modulo // F6
          </p>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Disparos
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Campanhas com template, anti-ban e monitor em tempo real.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Nova campanha</Button>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : q.error ? (
        <p className="text-sm text-red-400">Falha ao carregar campanhas.</p>
      ) : (
        <CampaignList
          campaigns={campaigns}
          onDelete={(c) => delMut.mutate(c.id)}
          deletingId={delMut.isPending ? (delMut.variables ?? null) : null}
        />
      )}

      <NewCampaignDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["campaigns", "list"] })}
      />
    </div>
  );
}
