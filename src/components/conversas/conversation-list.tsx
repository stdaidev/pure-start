import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export interface ConversationListItem {
  id: string;
  contact_name: string | null;
  contact_phone: string;
  assigned_to: string | null;
  agent_id: string | null;
  last_message_at: string | null;
  preview: { content: string | null; direction: string; media_type: string | null } | null;
  connection_id: string | null;
  connection_name: string | null;
  tags?: string[];
  lead_value_cents?: number | null;
}

function formatRelative(ts: string | null): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

function badge(item: ConversationListItem) {
  if (item.assigned_to) return { label: "humano", tone: "warn" };
  if (!item.agent_id) return { label: "sem agente", tone: "muted" };
  return { label: "IA", tone: "ok" };
}

export function ConversationList(props: {
  items: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  showConnection?: boolean;
}) {
  const { items, activeId, onSelect, loading, showConnection } = props;

  if (loading) {
    return (
      <div
        className="p-6 text-center text-xs text-muted-foreground"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        carregando...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="p-6 text-center text-xs text-muted-foreground"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        nenhuma conversa
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((c) => {
        const b = badge(c);
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full flex-col gap-1 border-b border-border/40 px-4 py-3 text-left transition-colors",
                active ? "bg-primary/10" : "hover:bg-muted/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="truncate text-sm font-medium">
                    {c.contact_name || c.contact_phone}
                  </span>
                  {showConnection && c.connection_name ? (
                    <span
                      className="shrink-0 truncate text-[10px] uppercase tracking-widest text-muted-foreground/80"
                      style={{ fontFamily: "var(--font-mono)" }}
                      title={`recebida via ${c.connection_name}`}
                    >
                      // {c.connection_name}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className="text-[10px] uppercase tracking-widest text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {formatRelative(c.last_message_at)}
                  </span>
                  {c.preview ? (
                    c.preview.direction === "outbound" ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <ArrowDownLeft className="h-3 w-3 text-red-500" />
                    )
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-widest",
                    b.tone === "ok" && "bg-primary/20 text-primary",
                    b.tone === "warn" && "bg-yellow-500/20 text-yellow-300",
                    b.tone === "muted" && "bg-muted text-muted-foreground",
                  )}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {b.label}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {c.preview?.content ??
                    (c.preview?.media_type ? `[${c.preview.media_type}]` : "—")}
                </span>
              </div>
              {c.lead_value_cents != null || (c.tags && c.tags.length > 0) ? (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {c.lead_value_cents != null ? (
                    <span
                      className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] tabular-nums text-emerald-300"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {(c.lead_value_cents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  ) : null}
                  {(c.tags ?? []).slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
