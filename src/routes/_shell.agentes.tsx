import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteAgent, listAgents, toggleAgent } from "@/lib/agents.functions";
import { AgentDialog } from "@/components/agentes/agent-dialog";
import { IgnoredNumbersCard } from "@/components/agentes/ignored-numbers-card";

export const Route = createFileRoute("/_shell/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes // HUD" },
      { name: "description", content: "Configuracao dos agentes de IA." },
    ],
  }),
  component: AgentesPage,
});

function AgentesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listFn = useServerFn(listAgents);
  const toggleFn = useServerFn(toggleAgent);
  const deleteFn = useServerFn(deleteAgent);

  const listQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => listFn(),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Agente removido");
      qc.invalidateQueries({ queryKey: ["agents"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao remover"),
  });

  const agents = listQuery.data?.agents ?? [];

  function openNew() {
    setEditId(null);
    setDialogOpen(true);
  }
  function openEdit(id: string) {
    setEditId(id);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            modulo // F3
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Agentes
          </h1>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo agente
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div
          className="glass-card p-8 text-center text-sm text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          carregando...
        </div>
      ) : agents.length === 0 ? (
        <div className="glass-card hud-brackets flex flex-col items-center gap-3 p-12 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            nenhum agente
          </p>
          <p className="text-sm text-muted-foreground">
            Crie um agente para responder mensagens no WhatsApp com IA.
          </p>
          <Button onClick={openNew} className="mt-2 gap-2">
            <Plus className="h-4 w-4" />
            Novo agente
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {agents.map((a) => (
            <div
              key={a.id}
              className="glass-card flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span
                  className="truncate text-sm font-medium"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {a.name}
                </span>
                <span
                  className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {a.model} // temp {Number(a.temperature).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={a.active}
                    onCheckedChange={(v) => toggleMut.mutate({ id: a.id, active: v })}
                    aria-label="Ativar agente"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(a.id)}
                  aria-label="Editar agente"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(a.id)}
                  aria-label="Remover agente"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AgentDialog open={dialogOpen} onOpenChange={setDialogOpen} agentId={editId} />

      <div className="mt-10">
        <IgnoredNumbersCard />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Conversas ligadas a este agente pararao de responder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
