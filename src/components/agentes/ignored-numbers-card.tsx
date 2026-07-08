import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addIgnoredNumber,
  listIgnoredNumbers,
  removeIgnoredNumber,
} from "@/lib/agent-ignored.functions";

export function IgnoredNumbersCard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listIgnoredNumbers);
  const addFn = useServerFn(addIgnoredNumber);
  const removeFn = useServerFn(removeIgnoredNumber);

  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");

  const listQuery = useQuery({
    queryKey: ["agent-ignored-numbers"],
    queryFn: () => listFn(),
  });

  const addMut = useMutation({
    mutationFn: () => addFn({ data: { phone, label: label || null } }),
    onSuccess: () => {
      toast.success("Numero adicionado");
      setPhone("");
      setLabel("");
      qc.invalidateQueries({ queryKey: ["agent-ignored-numbers"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao adicionar"),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Numero removido");
      qc.invalidateQueries({ queryKey: ["agent-ignored-numbers"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao remover"),
  });

  const items = listQuery.data?.items ?? [];

  return (
    <div className="glass-card space-y-4 p-5">
      <div>
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Numeros que o agente nao atende
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Amigos, funcionarios ou parceiros. Mensagens desses numeros continuam
          aparecendo na inbox, mas o agente nao responde automaticamente.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!phone.trim()) {
            toast.error("Telefone obrigatorio");
            return;
          }
          addMut.mutate();
        }}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="ign-phone">Telefone</Label>
          <Input
            id="ign-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(28) 99991-4358 ou 5528999914358"
            maxLength={40}
            inputMode="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ign-label">Rotulo (opcional)</Label>
          <Input
            id="ign-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Funcionario Joao"
            maxLength={120}
          />
        </div>
        <Button type="submit" disabled={addMut.isPending} className="gap-2">
          <Plus className="h-4 w-4" />
          {addMut.isPending ? "Adicionando..." : "Adicionar"}
        </Button>
      </form>

      {listQuery.isLoading ? (
        <p
          className="text-xs text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          carregando...
        </p>
      ) : items.length === 0 ? (
        <p
          className="text-xs text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          nenhum numero na lista
        </p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-md border border-white/5">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span
                  className="truncate text-sm"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  +{it.phone_e164}
                </span>
                {it.label ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {it.label}
                  </span>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeMut.mutate(it.id)}
                disabled={removeMut.isPending}
                aria-label="Remover numero"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}