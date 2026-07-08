import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  refreshQr,
  renameConnection,
} from "@/lib/connections.functions";
import {
  listAgents,
  setConnectionAgent,
  setConnectionIgnoreGroups,
} from "@/lib/agents.functions";
import { StatusBadge } from "@/components/conexoes/status-badge";
import { NewConnectionDialog } from "@/components/conexoes/new-connection-dialog";
import { QrDisplay } from "@/components/conexoes/qr-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [qrConnId, setQrConnId] = useState<string | null>(null);

  const listFn = useServerFn(listConnections);
  const statusFn = useServerFn(getConnectionStatus);
  const deleteFn = useServerFn(deleteConnection);
  const refreshQrFn = useServerFn(refreshQr);
  const agentsFn = useServerFn(listAgents);
  const setAgentFn = useServerFn(setConnectionAgent);
  const setIgnoreFn = useServerFn(setConnectionIgnoreGroups);
  const renameFn = useServerFn(renameConnection);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const listQuery = useQuery({
    queryKey: ["connections"],
    queryFn: () => listFn(),
    refetchInterval: 5000,
  });

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsFn(),
  });

  const setAgentMut = useMutation({
    mutationFn: (v: { connectionId: string; agentId: string | null }) =>
      setAgentFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
    onError: (e: Error) => toast.error(e.message || "Falha ao vincular agente"),
  });

  const setIgnoreMut = useMutation({
    mutationFn: (v: { connectionId: string; ignoreGroups: boolean }) =>
      setIgnoreFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar"),
  });

  const refreshMut = useMutation({
    mutationFn: (id: string) => statusFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar"),
  });

  const reconnectMut = useMutation({
    mutationFn: (id: string) => refreshQrFn({ data: { id } }),
    onSuccess: (_, id) => {
      setQrConnId(id);
      qc.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar QR"),
  });

  // Enquanto o QR dialog esta aberto, faz polling do status para fechar
  // sozinho quando o WhatsApp conectar.
  const qrStatusQuery = useQuery({
    queryKey: ["connection-qr", qrConnId],
    queryFn: () => statusFn({ data: { id: qrConnId as string } }),
    enabled: !!qrConnId,
    refetchInterval: 3000,
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

  const renameMut = useMutation({
    mutationFn: (v: { id: string; name: string }) => renameFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      setRenamingId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao renomear"),
  });

  const connections = listQuery.data?.connections ?? [];
  const agents = agentsQuery.data?.agents ?? [];

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
              className="glass-card flex flex-col gap-4 px-5 py-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                  {renamingId === c.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = renameValue.trim();
                        if (v && v !== c.name) {
                          renameMut.mutate({ id: c.id, name: v });
                        } else {
                          setRenamingId(null);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => setRenamingId(null)}
                        className="h-7 w-56"
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="group flex items-center gap-2 text-sm font-medium"
                      style={{ fontFamily: "var(--font-display)" }}
                      onClick={() => {
                        setRenameValue(c.name);
                        setRenamingId(c.id);
                      }}
                      aria-label="Renomear conexao"
                    >
                      <span>{c.name}</span>
                      <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                    </button>
                  )}
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
                    onClick={() => reconnectMut.mutate(c.id)}
                    disabled={
                      reconnectMut.isPending && reconnectMut.variables === c.id
                    }
                    aria-label="Reconectar (novo QR)"
                    title="Reconectar (novo QR)"
                  >
                    <QrCode className="h-4 w-4" />
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
              <div className="grid gap-3 border-t border-border/40 pt-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Agente default
                  </Label>
                  <Select
                    value={c.default_agent_id ?? "__none"}
                    onValueChange={(v) =>
                      setAgentMut.mutate({
                        connectionId: c.id,
                        agentId: v === "__none" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Nenhum</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Ignorar grupos
                  </Label>
                  <Switch
                    checked={c.ignore_groups ?? true}
                    onCheckedChange={(v) =>
                      setIgnoreMut.mutate({
                        connectionId: c.id,
                        ignoreGroups: v,
                      })
                    }
                    aria-label="Ignorar mensagens de grupos"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewConnectionDialog open={newOpen} onOpenChange={setNewOpen} />

      <Dialog
        open={!!qrConnId}
        onOpenChange={(o) => !o && setQrConnId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reconectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR no aparelho. Fecha sozinho ao conectar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <QrDisplay base64={qrStatusQuery.data?.qr ?? null} />
            <p
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              status: {qrStatusQuery.data?.status ?? "..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {qrStatusQuery.data?.status === "connected" && qrConnId ? (
        <AutoCloseOnConnect onDone={() => setQrConnId(null)} />
      ) : null}

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