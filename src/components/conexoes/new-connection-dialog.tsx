import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

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
import { toast } from "sonner";

import {
  createConnection,
  getConnectionStatus,
  refreshQr,
} from "@/lib/connections.functions";
import { QrDisplay } from "./qr-display";
import { StatusBadge } from "./status-badge";

export function NewConnectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const createFn = useServerFn(createConnection);
  const statusFn = useServerFn(getConnectionStatus);
  const refreshFn = useServerFn(refreshQr);

  const createMut = useMutation({
    mutationFn: (n: string) => createFn({ data: { name: n } }),
    onSuccess: (res) => {
      setConnectionId(res.id);
      qc.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao criar conexao"),
  });

  const statusQuery = useQuery({
    queryKey: ["connection-status", connectionId],
    queryFn: () => statusFn({ data: { id: connectionId! } }),
    enabled: !!connectionId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "connected" || s === "error" ? false : 3000;
    },
  });

  useEffect(() => {
    if (statusQuery.data?.status === "connected") {
      toast.success("Conexao pareada");
      qc.invalidateQueries({ queryKey: ["connections"] });
    }
  }, [statusQuery.data?.status, qc]);

  useEffect(() => {
    if (!open) {
      setName("");
      setConnectionId(null);
    }
  }, [open]);

  const refreshMut = useMutation({
    mutationFn: () => refreshFn({ data: { id: connectionId! } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["connection-status", connectionId] }),
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar QR"),
  });

  const qr = statusQuery.data?.qr ?? createMut.data?.qr ?? null;
  const status = statusQuery.data?.status ?? createMut.data?.status ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
            Nova conexao
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR no WhatsApp &gt; Aparelhos conectados.
          </DialogDescription>
        </DialogHeader>

        {!connectionId ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) createMut.mutate(name.trim());
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="conn-name">Nome</Label>
              <Input
                id="conn-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: comercial"
                maxLength={64}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending || !name.trim()}>
                {createMut.isPending ? "Criando..." : "Gerar QR"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <StatusBadge status={status} />
            <QrDisplay base64={qr} />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refreshMut.mutate()}
                disabled={refreshMut.isPending}
              >
                {refreshMut.isPending ? "Atualizando..." : "Atualizar QR"}
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}