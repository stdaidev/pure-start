import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { ConversationList } from "@/components/conversas/conversation-list";
import { MessageList } from "@/components/conversas/message-list";
import { Composer } from "@/components/conversas/composer";
import { useConversationsRealtime } from "@/hooks/use-conversations-realtime";
import {
  assignConversation,
  deleteConversation,
  getMessages,
  listConversations,
  sendConversationMessage,
} from "@/lib/conversations.functions";
import { listConnections } from "@/lib/connections.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/conversas")({
  head: () => ({
    meta: [
      { title: "Conversas // HUD" },
      { name: "description", content: "Inbox e handoff das conversas." },
    ],
  }),
  component: ConversasPage,
});

function ConversasPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [connectionFilter, setConnectionFilter] = useState<string | "all">(
    "all",
  );

  const listFn = useServerFn(listConversations);
  const msgsFn = useServerFn(getMessages);
  const assignFn = useServerFn(assignConversation);
  const sendFn = useServerFn(sendConversationMessage);
  const connectionsFn = useServerFn(listConnections);
  const deleteFn = useServerFn(deleteConversation);

  const listQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listFn(),
    refetchInterval: 15_000,
  });

  const connectionsQuery = useQuery({
    queryKey: ["connections"],
    queryFn: () => connectionsFn(),
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () =>
      activeId
        ? msgsFn({ data: { conversationId: activeId, limit: 200 } })
        : Promise.resolve({ messages: [] }),
    enabled: !!activeId,
  });

  useConversationsRealtime(activeId);

  const assignMut = useMutation({
    mutationFn: (v: { id: string; to: "human" | null }) =>
      assignFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha no handoff"),
  });

  const sendMut = useMutation({
    mutationFn: (v: { conversationId: string; text: string }) =>
      sendFn({ data: v }),
    onSuccess: () => {
      if (activeId) {
        qc.invalidateQueries({ queryKey: ["messages", activeId] });
      }
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao enviar"),
  });

  const deleteMut = useMutation({
    mutationFn: (v: { id: string }) => deleteFn({ data: v }),
    onSuccess: () => {
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversa apagada");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao apagar"),
  });

  const allConversations = listQuery.data?.conversations ?? [];
  const connections = connectionsQuery.data?.connections ?? [];
  const conversations = useMemo(
    () =>
      connectionFilter === "all"
        ? allConversations
        : allConversations.filter((c) => c.connection_id === connectionFilter),
    [allConversations, connectionFilter],
  );
  const countsByConnection = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of allConversations) {
      if (!c.connection_id) continue;
      map.set(c.connection_id, (map.get(c.connection_id) ?? 0) + 1);
    }
    return map;
  }, [allConversations]);
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const messages = messagesQuery.data?.messages ?? [];
  const assigned = !!active?.assigned_to;
  const hasAgent = !!active?.agent_id;

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border/60">
        <div className="border-b border-border/60 px-4 py-3">
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            modulo // F4
          </p>
          <h1
            className="mt-1 text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Conversas
          </h1>
        </div>
        {connections.length > 0 ? (
          <div
            className="flex flex-wrap gap-1 border-b border-border/60 px-3 py-2"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <FilterChip
              active={connectionFilter === "all"}
              onClick={() => setConnectionFilter("all")}
              label={`todas (${allConversations.length})`}
            />
            {connections.map((c) => (
              <FilterChip
                key={c.id}
                active={connectionFilter === c.id}
                onClick={() => setConnectionFilter(c.id)}
                label={`${c.name} (${countsByConnection.get(c.id) ?? 0})`}
              />
            ))}
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            items={conversations}
            activeId={activeId}
            onSelect={setActiveId}
            loading={listQuery.isLoading}
            showConnection={connectionFilter === "all"}
          />
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div
            className="flex flex-1 items-center justify-center text-sm text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            selecione uma conversa
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {active.contact_name || active.contact_phone}
                </p>
                <p
                  className="text-[10px] uppercase tracking-widest text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {active.contact_phone}
                  {active.agent_name ? ` // ${active.agent_name}` : ""}
                  {active.connection_name ? ` // ${active.connection_name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {assigned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      assignMut.mutate({ id: active.id, to: null })
                    }
                    disabled={assignMut.isPending}
                  >
                    Devolver para IA
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() =>
                      assignMut.mutate({ id: active.id, to: "human" })
                    }
                    disabled={assignMut.isPending}
                  >
                    Assumir
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Apagar conversa"
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar conversa?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todas as mensagens desta conversa serao removidas do
                        banco. Esta acao nao pode ser desfeita. Nao afeta o
                        WhatsApp do contato.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMut.mutate({ id: active.id })}
                      >
                        Apagar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto">
              <MessageList
                messages={messages}
                hasAgent={hasAgent}
                assigned={assigned}
              />
            </div>
            <Composer
              disabled={!assigned}
              pending={sendMut.isPending}
              onSend={async (text) => {
                await sendMut.mutateAsync({
                  conversationId: active.id,
                  text,
                });
              }}
              hint={
                !assigned
                  ? 'clique em "Assumir" para responder manualmente'
                  : undefined
              }
            />
          </>
        )}
      </section>
    </div>
  );
}

function FilterChip(props: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        "rounded border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors",
        props.active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border/60 text-muted-foreground hover:bg-muted/40",
      )}
    >
      {props.label}
    </button>
  );
}