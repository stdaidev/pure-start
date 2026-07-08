import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CampaignStatusBadge } from "@/components/disparos/status-badge";
import { useCampaignRealtime } from "@/hooks/use-campaign-realtime";
import {
  getCampaign,
  listRecipients,
  updateCampaignStatus,
} from "@/lib/campaigns.functions";

export const Route = createFileRoute("/_shell/disparos/$id")({
  head: () => ({
    meta: [
      { title: "Campanha // Disparos" },
      { name: "description", content: "Monitor da campanha em tempo real." },
    ],
  }),
  component: CampaignMonitor,
});

function CampaignMonitor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  useCampaignRealtime(id);

  const getFn = useServerFn(getCampaign);
  const listFn = useServerFn(listRecipients);
  const updateFn = useServerFn(updateCampaignStatus);

  const campaignQ = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const recipientsQ = useQuery({
    queryKey: ["recipients", id],
    queryFn: () =>
      listFn({ data: { campaign_id: id, limit: 100, offset: 0 } }),
  });

  const statusMut = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns", "list"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar"),
  });

  const campaign = campaignQ.data?.campaign;
  const progress = campaignQ.data?.progress;
  const status = campaign?.status ?? "draft";

  const canActivate = status === "draft" || status === "scheduled" || status === "paused";
  const canPause = status === "running";
  const canCancel = ["draft", "scheduled", "running", "paused"].includes(status);

  const stats = useMemo(
    () => [
      { k: "enviados", v: progress?.sent ?? 0 },
      { k: "pendentes", v: progress?.pending ?? 0 },
      { k: "falhas", v: progress?.failed ?? 0 },
      { k: "opt-out", v: progress?.skipped_optout ?? 0 },
    ],
    [progress],
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/disparos"
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ← disparos
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {campaign?.name ?? "Carregando..."}
            </h1>
            <CampaignStatusBadge status={status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={!canActivate || statusMut.isPending}
            onClick={() => statusMut.mutate({ data: { id, status: "running" } })}
          >
            Ativar
          </Button>
          <Button
            variant="outline"
            disabled={!canPause || statusMut.isPending}
            onClick={() => statusMut.mutate({ data: { id, status: "paused" } })}
          >
            Pausar
          </Button>
          <Button
            variant="outline"
            disabled={!canCancel || statusMut.isPending}
            onClick={() => statusMut.mutate({ data: { id, status: "canceled" } })}
          >
            Cancelar
          </Button>
        </div>
      </header>

      <div
        className="grid grid-cols-4 gap-3"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {stats.map((s) => (
          <div key={s.k} className="rounded border border-border/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {s.k}
            </p>
            <p className="text-xl font-semibold">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto rounded border border-border/60">
        <table className="w-full text-sm">
          <thead
            className="border-b border-border/60 bg-muted/30 text-left text-[10px] uppercase tracking-widest text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <tr>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Enviado em</th>
              <th className="px-3 py-2">Erro</th>
            </tr>
          </thead>
          <tbody>
            {(recipientsQ.data?.recipients ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border/40">
                <td
                  className="px-3 py-2 text-xs"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {maskPhone(r.contact_phone)}
                </td>
                <td className="px-3 py-2 text-xs">{r.contact_name ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.status}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.sent_at ? new Date(r.sent_at).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-red-400">
                  {r.error ?? "—"}
                </td>
              </tr>
            ))}
            {(recipientsQ.data?.recipients?.length ?? 0) === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={5}>
                  Sem destinatarios.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function maskPhone(p: string): string {
  if (p.length <= 4) return "****";
  return p.slice(0, 4) + "****" + p.slice(-2);
}