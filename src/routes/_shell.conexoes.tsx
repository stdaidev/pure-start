import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  deleteConnection,
  getConnectionStatus,
  listConnections,
} from "@/lib/connections.functions";
import { StatusBadge } from "@/components/conexoes/status-badge";
import { NewConnectionDialog } from "@/components/conexoes/new-connection-dialog";

export const Route = createFileRoute("/_shell/conexoes")({
  head: () => ({
    meta: [
      { title: "Conexoes // HUD" },
      { name: "description", content: "Instancias WhatsApp via Evolution API." },
    ],
  }),
  component: ConexoesPage,
});

function ConexoesPage() {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listFn = useServerFn(listConnections);
  const statusFn = useServerFn(getConnectionStatus);
  const deleteFn = useServerFn(deleteConnection);

  const listQuery = useQuery({
    queryKey: ["connections"],
    queryFn: () => listFn(),
    refetchInterval: 5000,
  });

  const refreshMut = useMutation({
    mutationFn: (id: string) => statusFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Conexao removida");
      qc.invalidateQueries({ queryKey: ["connections"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao remover"),
  });

  const connections = listQuery.data?.connections ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            modulo // F2
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Conexoes
          </h1>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova conexao
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div
          className="glass-card p-8 text-center text-sm text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          carregando...
        </div>
      ) : connections.length === 0 ? (
        <div className="glass-card hud-brackets flex flex-col items-center gap-3 p-12 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            nenhuma instancia
          </p>
          <p className="text-sm text-muted-foreground">
            Crie sua primeira conexao WhatsApp para receber e disparar mensagens.
          </p>
          <Button onClick={() => setNewOpen(true)} className="mt-2 gap-2">
            <Plus className="h-4 w-4" />
            Nova conexao
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {connections.map((c) => (
            <div
              key={c.id}
              className="glass-card flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex flex-col gap-1.5">
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {c.name}
                </span>
                <StatusBadge status={c.status} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refreshMut.mutate(c.id)}
                  disabled={refreshMut.isPending}
                  aria-label="Atualizar status"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(c.id)}
                  aria-label="Remover conexao"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewConnectionDialog open={newOpen} onOpenChange={setNewOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexao?</AlertDialogTitle>
            <AlertDialogDescription>
              A instancia sera desconectada do Evolution e removida daqui.
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