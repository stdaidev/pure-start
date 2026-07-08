import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "RASCUNHO", className: "bg-muted/40 text-muted-foreground border-border/60" },
  scheduled: { label: "AGENDADA", className: "bg-sky-500/15 text-sky-400 border-sky-500/40" },
  running: { label: "RODANDO", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  paused: { label: "PAUSADA", className: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
  canceled: { label: "CANCELADA", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40" },
  finished: { label: "FINALIZADA", className: "bg-primary/15 text-primary border-primary/40" },
  stopped_reply: { label: "RESPONDEU", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40" },
  stopped_recent_reply: { label: "COOLDOWN", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/40" },
  sending: { label: "ENVIANDO", className: "bg-sky-500/15 text-sky-300 border-sky-500/40" },
  pending: { label: "PENDENTE", className: "bg-muted/40 text-muted-foreground border-border/60" },
  sent: { label: "ENVIADO", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  failed: { label: "FALHA", className: "bg-red-500/15 text-red-400 border-red-500/40" },
  skipped_optout: { label: "OPT-OUT", className: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
};

export function CampaignStatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status ?? "draft").toLowerCase();
  const item = MAP[key] ?? MAP.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]",
        item.className,
      )}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {item.label}
    </span>
  );
}