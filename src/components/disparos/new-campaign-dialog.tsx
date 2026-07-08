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
import { TemplateEditor } from "./template-editor";
import { listConnections } from "@/lib/connections.functions";
import {
  createCampaign,
  listSpreadsheets,
  getSpreadsheetPreview,
} from "@/lib/campaigns.functions";

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
  const [connectionId, setConnectionId] = useState<string>("");
  const [spreadsheetId, setSpreadsheetId] = useState<string>("");
  const [template, setTemplate] = useState("Ola {{nome}}, tudo bem?");
  const [minMs, setMinMs] = useState(8000);
  const [maxMs, setMaxMs] = useState(20000);
  const [dailyCap, setDailyCap] = useState(200);
  const [windowStart, setWindowStart] = useState("09:00");
  const [windowEnd, setWindowEnd] = useState("20:00");

  const listConnFn = useServerFn(listConnections);
  const listSheetFn = useServerFn(listSpreadsheets);
  const previewFn = useServerFn(getSpreadsheetPreview);
  const createFn = useServerFn(createCampaign);

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
    setConnectionId("");
    setSpreadsheetId("");
    setTemplate("Ola {{nome}}, tudo bem?");
    setMinMs(8000);
    setMaxMs(20000);
    setDailyCap(200);
    setWindowStart("09:00");
    setWindowEnd("20:00");
  }

  const sample = (previewQ.data?.first_row ?? null) as
    | Record<string, unknown>
    | null;

  const canNext = useMemo(() => {
    if (step === 1) return !!name.trim() && !!connectionId && !!spreadsheetId;
    if (step === 2) return template.trim().length > 0;
    if (step === 3)
      return (
        minMs >= 0 &&
        maxMs >= minMs &&
        dailyCap >= 1 &&
        /^\d{2}:\d{2}$/.test(windowStart) &&
        /^\d{2}:\d{2}$/.test(windowEnd)
      );
    return true;
  }, [step, name, connectionId, spreadsheetId, template, minMs, maxMs, dailyCap, windowStart, windowEnd]);

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
              <Label>Conexao</Label>
              <Select value={connectionId} onValueChange={setConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conexao" />
                </SelectTrigger>
                <SelectContent>
                  {(connQ.data?.connections ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <TemplateEditor
            value={template}
            onChange={setTemplate}
            sample={sample}
          />
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
          </div>
        ) : null}

        {step === 4 ? (
          <div
            className="space-y-2 rounded border border-border/60 bg-muted/20 p-4 text-sm"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Row k="nome" v={name} />
            <Row
              k="conexao"
              v={
                connQ.data?.connections?.find((c) => c.id === connectionId)
                  ?.name ?? connectionId
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
            <Row k="janela" v={`${windowStart} - ${windowEnd} (SP)`} />
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
                    connection_id: connectionId,
                    spreadsheet_id: spreadsheetId,
                    template_text: template,
                    min_ms: minMs,
                    max_ms: maxMs,
                    daily_cap: dailyCap,
                    window_start: windowStart,
                    window_end: windowEnd,
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