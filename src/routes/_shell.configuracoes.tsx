import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import {
  getWorkspaceFlags,
  updateWorkspaceKillSwitch,
  updateWorkspaceCooldown,
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
  const setCooldownFn = useServerFn(updateWorkspaceCooldown);
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
  const defaultHours = q.data?.cooldown_default_hours ?? 24;

  const [cdUnit, setCdUnit] = useState<"hours" | "days">("hours");
  const [cdValue, setCdValue] = useState<number>(24);
  useEffect(() => {
    if (defaultHours % 24 === 0 && defaultHours >= 24) {
      setCdUnit("days");
      setCdValue(defaultHours / 24);
    } else {
      setCdUnit("hours");
      setCdValue(defaultHours);
    }
  }, [defaultHours]);

  const cdMut = useMutation({
    mutationFn: () => setCooldownFn({ data: { value: cdValue, unit: cdUnit } }),
    onSuccess: (r) => {
      toast.success(`Cooldown padrao: ${r.cooldown_default_hours}h`);
      qc.invalidateQueries({ queryKey: ["workspace-flags"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao salvar"),
  });

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

      <section className="rounded border border-border/60 bg-muted/10 p-4">
        <h2 className="text-sm font-semibold">Cooldown padrao por lead</h2>
        <p className="mt-1 text-xs text-muted-foreground max-w-xl">
          Nao enviar para leads que ja responderam nos ultimos N tempo. Vale
          como minimo global — cada campanha pode aumentar, nunca reduzir.
        </p>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="cd-value" className="text-xs">
              Janela
            </Label>
            <Input
              id="cd-value"
              type="number"
              min={0}
              max={720}
              value={cdValue}
              onChange={(e) => setCdValue(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Unidade</Label>
            <Select
              value={cdUnit}
              onValueChange={(v) => setCdUnit(v as "hours" | "days")}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">horas</SelectItem>
                <SelectItem value="days">dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => cdMut.mutate()}
            disabled={cdMut.isPending}
          >
            {cdMut.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <span
            className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            atual: {defaultHours}h
          </span>
        </div>
      </section>
    </div>
  );
}