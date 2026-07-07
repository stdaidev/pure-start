import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  connected: { label: "ONLINE", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  connecting: { label: "CONECTANDO", className: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
  qr: { label: "AGUARDANDO QR", className: "bg-sky-500/15 text-sky-400 border-sky-500/40" },
  pending: { label: "PENDENTE", className: "bg-muted/40 text-muted-foreground border-border/60" },
  disconnected: { label: "OFFLINE", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40" },
  error: { label: "ERRO", className: "bg-red-500/15 text-red-400 border-red-500/40" },
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status ?? "pending").toLowerCase();
  const item = MAP[key] ?? MAP.pending;
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