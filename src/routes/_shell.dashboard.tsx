import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardSummary } from "@/lib/dashboard.functions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CampaignStatusBadge } from "@/components/disparos/status-badge";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard // HUD" },
      {
        name: "description",
        content: "Painel operacional do agente WhatsApp.",
      },
    ],
  }),
  component: DashboardPage,
});

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function DashboardPage() {
  const fn = useServerFn(getDashboardSummary);
  const q = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => fn(),
    refetchInterval: 15_000,
  });

  const s = q.data;

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <header>
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          modulo // F7
        </p>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Dashboard
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Atualiza a cada 15s.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="conexoes ativas"
          value={s ? s.connections_connected : "—"}
          hint="status = connected"
        />
        <KpiCard
          label="campanhas rodando"
          value={s ? s.campaigns_running : "—"}
          hint="status = running"
        />
        <KpiCard
          label="msgs hoje (out/in)"
          value={s ? `${s.messages_today.out} / ${s.messages_today.in}` : "—"}
          hint="desde 00:00 local"
        />
        <KpiCard
          label="respostas hoje"
          value={s ? s.replies_today : "—"}
          hint="mensagens inbound hoje"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="valor em aberto"
          value={
            s
              ? (s.pipeline.open_value_cents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })
              : "—"
          }
          hint="conversas ativas com valor"
        />
        <KpiCard
          label="valor ganho"
          value={
            s
              ? (s.pipeline.won_value_cents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })
              : "—"
          }
          hint="outcome = won"
        />
        <div className="rounded border border-border/60 bg-muted/10 p-3">
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            top tags
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {s && s.pipeline.top_tags.length > 0 ? (
              s.pipeline.top_tags.map((t) => (
                <span
                  key={t.tag}
                  className="rounded border border-border/60 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  #{t.tag} · {t.count}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">sem tags ainda</span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded border border-border/60 bg-muted/10">
        <header className="flex items-center justify-between border-b border-border/60 px-4 py-2">
          <h2 className="text-sm font-semibold">Ultimas campanhas</h2>
          <Link
            to="/disparos"
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ver todas →
          </Link>
        </header>
        <div className="divide-y divide-border/60">
          {q.isLoading ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">Carregando…</p>
          ) : q.isError ? (
            <p className="px-4 py-6 text-xs text-red-400">Falha ao carregar sumario.</p>
          ) : s && s.last_campaigns.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">Nenhuma campanha ainda.</p>
          ) : (
            s?.last_campaigns.map((c) => (
              <Link
                key={c.id}
                to="/disparos/$id"
                params={{ id: c.id }}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p
                    className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {fmtDate(c.created_at)}
                  </p>
                </div>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {c.sent}/{c.total}
                </span>
                <CampaignStatusBadge status={c.status} />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
