import { Link } from "@tanstack/react-router";
import { CampaignStatusBadge } from "./status-badge";

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  connection_id: string | null;
  created_at: string;
  progress: { total: number; sent: number; failed: number; pending: number };
};

export function CampaignList({ campaigns }: { campaigns: CampaignRow[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        Nenhuma campanha criada. Clique em "Nova campanha" para comecar.
      </div>
    );
  }
  return (
    <div className="overflow-auto rounded border border-border/60">
      <table className="w-full text-sm">
        <thead
          className="border-b border-border/60 bg-muted/30 text-left text-[10px] uppercase tracking-widest text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <tr>
            <th className="px-3 py-2">Nome</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Progresso</th>
            <th className="px-3 py-2">Criada em</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const p = c.progress;
            const done = p.sent + p.failed;
            return (
              <tr
                key={c.id}
                className="border-b border-border/40 hover:bg-muted/20"
              >
                <td className="px-3 py-2">
                  <Link
                    to="/disparos/$id"
                    params={{ id: c.id }}
                    className="text-primary hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <CampaignStatusBadge status={c.status} />
                </td>
                <td
                  className="px-3 py-2 text-xs"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {done}/{p.total}
                  {p.failed > 0 ? (
                    <span className="ml-2 text-red-400">
                      {p.failed} falhas
                    </span>
                  ) : null}
                </td>
                <td
                  className="px-3 py-2 text-xs text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}