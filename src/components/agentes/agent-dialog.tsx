import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAgent, saveAgent } from "@/lib/agents.functions";

const MODELS = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"];
const TOOLS = [
  { name: "resetar", label: "resetar (limpa historico)" },
  { name: "transferir_humano", label: "transferir_humano" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string | null;
}

type FormState = {
  name: string;
  description: string;
  model: string;
  temperature: number;
  system_prompt: string;
  tools: string[];
  humanization: { chunk: boolean; min_ms: number; max_ms: number };
  active: boolean;
};

const empty: FormState = {
  name: "",
  description: "",
  model: "gpt-4.1-mini",
  temperature: 0.7,
  system_prompt: "",
  tools: [],
  humanization: { chunk: true, min_ms: 800, max_ms: 3500 },
  active: true,
};

export function AgentDialog({ open, onOpenChange, agentId }: Props) {
  const qc = useQueryClient();
  const getFn = useServerFn(getAgent);
  const saveFn = useServerFn(saveAgent);
  const [form, setForm] = useState<FormState>(empty);

  const loadQuery = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getFn({ data: { id: agentId! } }),
    enabled: !!agentId && open,
  });

  useEffect(() => {
    if (!open) {
      setForm(empty);
      return;
    }
    if (agentId && loadQuery.data) {
      const a = loadQuery.data as any;
      setForm({
        name: a.name ?? "",
        description: a.description ?? "",
        model: a.model ?? "gpt-4.1-mini",
        temperature: Number(a.temperature ?? 0.7),
        system_prompt: a.system_prompt ?? "",
        tools: Array.isArray(a.tools) ? a.tools : [],
        humanization: {
          chunk: a.humanization?.chunk ?? true,
          min_ms: a.humanization?.min_ms ?? 800,
          max_ms: a.humanization?.max_ms ?? 3500,
        },
        active: a.active ?? true,
      });
    }
  }, [open, agentId, loadQuery.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          ...(agentId ? { id: agentId } : {}),
          name: form.name.trim(),
          description: form.description.trim() || null,
          model: form.model,
          temperature: form.temperature,
          system_prompt: form.system_prompt,
          tools: form.tools,
          humanization: form.humanization,
          active: form.active,
        },
      }),
    onSuccess: () => {
      toast.success(agentId ? "Agente atualizado" : "Agente criado");
      qc.invalidateQueries({ queryKey: ["agents"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao salvar"),
  });

  function toggleTool(name: string, on: boolean) {
    setForm((f) => ({
      ...f,
      tools: on ? [...new Set([...f.tools, name])] : f.tools.filter((t) => t !== name),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
            {agentId ? "Editar agente" : "Novo agente"}
          </DialogTitle>
          <DialogDescription>
            Persona, modelo, humanizacao e tools do agente de IA.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error("Nome obrigatorio");
              return;
            }
            saveMut.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="a-name">Nome</Label>
              <Input
                id="a-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-model">Modelo</Label>
              <Select
                value={form.model}
                onValueChange={(v) => setForm({ ...form, model: v })}
              >
                <SelectTrigger id="a-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-desc">Descricao</Label>
            <Input
              id="a-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              placeholder="opcional"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Temperatura: {form.temperature.toFixed(2)}</Label>
            <Slider
              min={0}
              max={2}
              step={0.05}
              value={[form.temperature]}
              onValueChange={([v]) => setForm({ ...form, temperature: v })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-prompt">System prompt</Label>
            <Textarea
              id="a-prompt"
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              rows={10}
              maxLength={20000}
              placeholder="Voce e um atendente..."
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label>Tools disponiveis</Label>
            <div className="flex flex-col gap-2">
              {TOOLS.map((t) => (
                <label
                  key={t.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={form.tools.includes(t.name)}
                    onCheckedChange={(v) => toggleTool(t.name, !!v)}
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="glass-card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="a-chunk">Humanizacao (chunk + delay)</Label>
              <Switch
                id="a-chunk"
                checked={form.humanization.chunk}
                onCheckedChange={(v) =>
                  setForm({
                    ...form,
                    humanization: { ...form.humanization, chunk: v },
                  })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Min: {form.humanization.min_ms} ms</Label>
                <Slider
                  min={0}
                  max={10000}
                  step={100}
                  value={[form.humanization.min_ms]}
                  onValueChange={([v]) =>
                    setForm({
                      ...form,
                      humanization: { ...form.humanization, min_ms: v },
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max: {form.humanization.max_ms} ms</Label>
                <Slider
                  min={0}
                  max={12000}
                  step={100}
                  value={[form.humanization.max_ms]}
                  onValueChange={([v]) =>
                    setForm({
                      ...form,
                      humanization: { ...form.humanization, max_ms: v },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="a-active">Ativo</Label>
            <Switch
              id="a-active"
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}