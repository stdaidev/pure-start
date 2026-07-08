import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  getWorkspaceFlags,
  updateWorkspaceKillSwitch,
} from "@/lib/workspace.functions";

export const Route = createFileRoute("/_shell/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configuracoes // HUD" },
      { name: "description", content: "Kill-switch, secrets, provedores." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getWorkspaceFlags);
  const setFn = useServerFn(updateWorkspaceKillSwitch);
  const q = useQuery({ queryKey: ["workspace-flags"], queryFn: () => getFn() });
  const mut = useMutation({
    mutationFn: (v: boolean) => setFn({ data: { dispatch_paused: v } }),
    onSuccess: (r) => {
      toast.success(
        r.dispatch_paused
          ? "Disparos globais PAUSADOS"
          : "Disparos globais LIBERADOS",
      );
      qc.invalidateQueries({ queryKey: ["workspace-flags"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao alternar"),
  });

  const paused = q.data?.dispatch_paused ?? false;

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <header>
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          modulo // F6.1
        </p>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Configuracoes
        </h1>
      </header>

      <section className="rounded border border-border/60 bg-muted/10 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">
              Kill-switch global de disparos
            </h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-xl">
              Pausa TODAS as campanhas do workspace imediatamente. O worker
              detecta no proximo tick (ate ~1 min) e para de enviar. Campanhas
              continuam com status "running" — desative o interruptor para
              retomar.
            </p>
            {paused ? (
              <p
                className="mt-2 text-[10px] uppercase tracking-widest text-red-400"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                ● disparos pausados
              </p>
            ) : (
              <p
                className="mt-2 text-[10px] uppercase tracking-widest text-emerald-400"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                ● disparos liberados
              </p>
            )}
          </div>
          <Switch
            checked={paused}
            disabled={q.isLoading || mut.isPending}
            onCheckedChange={(v) => mut.mutate(v)}
            aria-label="Kill-switch global"
          />
        </div>
      </section>
    </div>
  );
}