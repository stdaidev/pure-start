import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TemplateEditor } from "./template-editor";
import { Switch } from "@/components/ui/switch";
import { listConnections } from "@/lib/connections.functions";
import {
  createCampaign,
  listSpreadsheets,
  getSpreadsheetPreview,
} from "@/lib/campaigns.functions";
import { getWorkspaceFlags } from "@/lib/workspace.functions";
import { renderTemplate } from "@/lib/template-render";

type Step = 1 | 2 | 3 | 4;

export function NewCampaignDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}) {
  const { open, onOpenChange, onCreated } = props;
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [connectionId, setConnectionId] = useState<string>("");
  const [connectionIds, setConnectionIds] = useState<string[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState<string>("");
  const [template, setTemplate] = useState("Ola {{nome}}, tudo bem?");
  const [minMs, setMinMs] = useState(8000);
  const [maxMs, setMaxMs] = useState(20000);
  const [dailyCap, setDailyCap] = useState(200);
  const [hourlyLimit, setHourlyLimit] = useState(60);
  const [windowStart, setWindowStart] = useState("09:00");
  const [windowEnd, setWindowEnd] = useState("20:00");
  const [cooldownEnabled, setCooldownEnabled] = useState(true);
  const [cooldownValue, setCooldownValue] = useState(24);
  const [cooldownUnit, setCooldownUnit] = useState<"hours" | "days">("hours");

  const listConnFn = useServerFn(listConnections);
  const listSheetFn = useServerFn(listSpreadsheets);
  const previewFn = useServerFn(getSpreadsheetPreview);
  const createFn = useServerFn(createCampaign);
  const wsFn = useServerFn(getWorkspaceFlags);

  const wsQ = useQuery({
    queryKey: ["workspace-flags"],
    queryFn: () => wsFn(),
    enabled: open,
  });
  const defaultCooldownHours = wsQ.data?.cooldown_default_hours ?? 24;
  const requestedHours =
    cooldownUnit === "days" ? cooldownValue * 24 : cooldownValue;
  const cooldownBelowMin =
    cooldownEnabled && requestedHours < defaultCooldownHours;

  const connQ = useQuery({
    queryKey: ["connections", "list"],
    queryFn: () => listConnFn(),
    enabled: open,
  });
  const sheetQ = useQuery({
    queryKey: ["spreadsheets", "list"],
    queryFn: () => listSheetFn(),
    enabled: open,
  });
  const previewQ = useQuery({
    queryKey: ["spreadsheet-preview", spreadsheetId],
    queryFn: () =>
      previewFn({ data: { spreadsheet_id: spreadsheetId } }),
    enabled: open && !!spreadsheetId,
  });

  const createMut = useMutation({
    mutationFn: createFn,
    onSuccess: (r) => {
      toast.success(`Campanha criada: ${r.recipients_created} destinatarios`);
      onCreated?.();
      onOpenChange(false);
      reset();
      navigate({ to: "/disparos/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao criar campanha"),
  });

  function reset() {
    setStep(1);
    setName("");
    setMode("single");
    setConnectionId("");
    setConnectionIds([]);
    setSpreadsheetId("");
    setTemplate("Ola {{nome}}, tudo bem?");
    setMinMs(8000);
    setMaxMs(20000);
    setDailyCap(200);
    setHourlyLimit(60);
    setWindowStart("09:00");
    setWindowEnd("20:00");
    setCooldownEnabled(true);
    setCooldownValue(24);
    setCooldownUnit("hours");
  }

  const sample = (previewQ.data?.first_row ?? null) as
    | Record<string, unknown>
    | null;

  const templateMissing = useMemo(
    () => (sample ? renderTemplate(template, sample).missing : []),
    [template, sample],
  );

  const availableConns = connQ.data?.connections ?? [];

  const canNext = useMemo(() => {
    if (step === 1) {
      if (!name.trim() || !spreadsheetId) return false;
      if (mode === "single") {
        const c = availableConns.find((x) => x.id === connectionId);
        return !!c && c.status === "connected";
      }
      const picked = availableConns.filter((c) =>
        connectionIds.includes(c.id),
      );
      return (
        picked.length >= 2 && picked.every((c) => c.status === "connected")
      );
    }
    if (step === 2)
      return template.trim().length > 0 && templateMissing.length === 0;
    if (step === 3)
      return (
        minMs >= 0 &&
        maxMs >= minMs &&
        dailyCap >= 1 &&
        hourlyLimit >= 1 &&
        /^\d{2}:\d{2}$/.test(windowStart) &&
        /^\d{2}:\d{2}$/.test(windowEnd) &&
        !cooldownBelowMin
      );
    return true;
  }, [step, name, mode, connectionId, connectionIds, spreadsheetId, template, templateMissing, minMs, maxMs, dailyCap, hourlyLimit, windowStart, windowEnd, cooldownBelowMin, availableConns]);

  function toggleConn(id: string) {
    setConnectionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Nova campanha
            <span
              className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              passo {step}/4
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Campanha de Julho"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Modo de disparo</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as "single" | "multi")}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="single" id="mode-single" />
                  <span>Uma conexao</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="multi" id="mode-multi" />
                  <span>Multi-instancia (rodizio)</span>
                </label>
              </RadioGroup>
              <p className="text-[10px] text-muted-foreground">
                {mode === "single"
                  ? "Envia por uma unica conexao. Ideal para volume baixo."
                  : "Rodizio round-robin entre as conexoes escolhidas (min 2). Reduz risco de ban."}
              </p>
            </div>
            {mode === "single" ? (
              <div className="flex flex-col gap-2">
                <Label>Conexao</Label>
                <Select value={connectionId} onValueChange={setConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conexao" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConns.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        disabled={c.status !== "connected"}
                      >
                        {c.name} — {c.status}
                        {c.status !== "connected" ? " (indisponivel)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {connectionId &&
                availableConns.find((c) => c.id === connectionId)?.status !==
                  "connected" ? (
                  <p className="text-[10px] text-red-400">
                    conexao nao esta conectada — selecione outra
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>Conexoes (min 2)</Label>
                <div className="flex flex-col gap-1 rounded border border-border/60 p-2 max-h-48 overflow-auto">
                  {availableConns.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">
                      Nenhuma conexao disponivel.
                    </p>
                  ) : null}
                  {availableConns.map((c) => {
                    const disabled = c.status !== "connected";
                    return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 rounded px-2 py-1 ${
                        disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-muted/30 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={connectionIds.includes(c.id)}
                        onChange={() => toggleConn(c.id)}
                      />
                      <span className="text-sm">
                        {c.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          — {c.status}
                        </span>
                      </span>
                    </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Selecionadas: {connectionIds.length}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Planilha</Label>
              <Select value={spreadsheetId} onValueChange={setSpreadsheetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma planilha" />
                </SelectTrigger>
                <SelectContent>
                  {(sheetQ.data?.spreadsheets ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.row_count} linhas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-2">
            <TemplateEditor
              value={template}
              onChange={setTemplate}
              sample={sample}
            />
            {sample && templateMissing.length > 0 ? (
              <p className="text-[11px] text-red-400">
                nao e possivel avancar: a planilha nao tem valor para{" "}
                {templateMissing.map((k) => `{{${k}}}`).join(", ")}
              </p>
            ) : null}
            {!sample ? (
              <p className="text-[11px] text-amber-400">
                planilha sem preview — nao da para validar placeholders
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Intervalo min (ms)</Label>
              <Input
                type="number"
                value={minMs}
                onChange={(e) => setMinMs(Number(e.target.value))}
              />
              {minMs < 3000 ? (
                <p className="text-[10px] text-amber-400">
                  atencao: intervalos abaixo de 3s aumentam risco de ban
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Intervalo max (ms)</Label>
              <Input
                type="number"
                value={maxMs}
                onChange={(e) => setMaxMs(Number(e.target.value))}
              />
              {maxMs < minMs ? (
                <p className="text-[10px] text-red-400">
                  max deve ser &gt;= min
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Teto diario</Label>
              <Input
                type="number"
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Teto por hora</Label>
              <Input
                type="number"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground">
                Limite por hora alem do teto diario (anti-ban).
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Janela (SP)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  placeholder="09:00"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  placeholder="20:00"
                />
              </div>
            </div>
            <div className="col-span-2 rounded border border-border/60 bg-muted/10 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Cooldown por lead</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Nao enviar para quem respondeu nos ultimos N. Minimo global: {defaultCooldownHours}h.
                  </p>
                </div>
                <Switch
                  checked={cooldownEnabled}
                  onCheckedChange={setCooldownEnabled}
                />
              </div>
              {cooldownEnabled ? (
                <div className="mt-2 flex items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Janela</Label>
                    <Input
                      type="number"
                      min={0}
                      max={720}
                      value={cooldownValue}
                      onChange={(e) => setCooldownValue(Number(e.target.value))}
                      className="w-28"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Unidade</Label>
                    <Select
                      value={cooldownUnit}
                      onValueChange={(v) => setCooldownUnit(v as "hours" | "days")}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">horas</SelectItem>
                        <SelectItem value="days">dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {cooldownBelowMin ? (
                    <p className="text-[10px] text-red-400 ml-2">
                      abaixo do minimo global ({defaultCooldownHours}h)
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div
            className="space-y-2 rounded border border-border/60 bg-muted/20 p-4 text-sm"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Row k="nome" v={name} />
            <Row k="modo" v={mode === "single" ? "single" : "multi (round-robin)"} />
            <Row
              k={mode === "single" ? "conexao" : "conexoes"}
              v={
                mode === "single"
                  ? availableConns.find((c) => c.id === connectionId)?.name ??
                    connectionId
                  : connectionIds
                      .map(
                        (id) =>
                          availableConns.find((c) => c.id === id)?.name ?? id,
                      )
                      .join(", ")
              }
            />
            <Row
              k="planilha"
              v={
                sheetQ.data?.spreadsheets?.find((s) => s.id === spreadsheetId)
                  ?.name ?? spreadsheetId
              }
            />
            <Row k="intervalo" v={`${minMs}-${maxMs} ms`} />
            <Row k="teto diario" v={String(dailyCap)} />
            <Row k="teto hora" v={String(hourlyLimit)} />
            <Row k="janela" v={`${windowStart} - ${windowEnd} (SP)`} />
            <Row
              k="cooldown"
              v={
                cooldownEnabled
                  ? `${cooldownValue} ${cooldownUnit}`
                  : "desligado"
              }
            />
          </div>
        ) : null}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            disabled={step === 1}
          >
            Voltar
          </Button>
          {step < 4 ? (
            <Button
              disabled={!canNext}
              onClick={() => setStep((s) => (s + 1) as Step)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              disabled={createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  data: {
                    name: name.trim(),
                    dispatch_mode: mode,
                    ...(mode === "single"
                      ? { connection_id: connectionId }
                      : { connection_ids: connectionIds }),
                    spreadsheet_id: spreadsheetId,
                    template_text: template,
                    min_ms: minMs,
                    max_ms: maxMs,
                    daily_cap: dailyCap,
                    hourly_limit: hourlyLimit,
                    window_start: windowStart,
                    window_end: windowEnd,
                    cooldown_enabled: cooldownEnabled,
                    cooldown_value: cooldownValue,
                    cooldown_unit: cooldownUnit,
                  },
                })
              }
            >
              {createMut.isPending ? "Criando..." : "Criar campanha"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-1 last:border-0">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {k}
      </span>
      <span className="text-sm">{v}</span>
    </div>
  );
}