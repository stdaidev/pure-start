import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ContactEditDialog,
  type EditableContact,
} from "@/components/contatos/contact-edit-dialog";
import {
  deleteContact,
  listContacts,
  updateContact,
} from "@/lib/contacts.functions";

export const Route = createFileRoute("/_shell/contatos")({
  head: () => ({
    meta: [
      { title: "Contatos // HUD" },
      { name: "description", content: "Base de contatos e opt-out." },
    ],
  }),
  component: ContatosPage,
});

const PAGE_SIZE = 100;

function ContatosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<EditableContact | null>(null);

  const listFn = useServerFn(listContacts);
  const updateFn = useServerFn(updateContact);
  const deleteFn = useServerFn(deleteContact);

  const listQuery = useQuery({
    queryKey: ["contacts", query, page],
    queryFn: () =>
      listFn({
        data: { query, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      }),
  });

  const updateMut = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
    onError: (e: Error) => toast.error(e.message || "Falha ao remover"),
  });

  const contacts = listQuery.data?.contacts ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            modulo // F5
          </p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Contatos
          </h1>
          <p className="text-xs text-muted-foreground">
            {total} contato(s) no workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="buscar nome ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(0);
                setQuery(search);
              }
            }}
            className="w-64"
          />
          <Button
            variant="outline"
            onClick={() => {
              setPage(0);
              setQuery(search);
            }}
          >
            Buscar
          </Button>
          <Button asChild>
            <Link to="/planilhas">Importar planilha</Link>
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto rounded border border-border/60">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-muted/30 text-left">
            <tr
              className="text-[10px] uppercase tracking-widest text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Opt-out</th>
              <th className="px-3 py-2">Atualizado</th>
              <th className="px-3 py-2 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  carregando...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  nenhum contato encontrado
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/40 hover:bg-muted/20"
                >
                  <td className="px-3 py-2">{c.name ?? "—"}</td>
                  <td
                    className="px-3 py-2 text-xs"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {c.phone}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {(c.tags ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={c.opt_out}
                      onCheckedChange={(v) =>
                        updateMut.mutate({ data: { id: c.id, opt_out: v } })
                      }
                    />
                  </td>
                  <td
                    className="px-3 py-2 text-xs text-muted-foreground"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {new Date(c.updated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditing({
                            id: c.id,
                            name: c.name,
                            tags: c.tags ?? [],
                          })
                        }
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Remover contato?")) {
                            deleteMut.mutate({ data: { id: c.id } });
                          }
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between text-xs text-muted-foreground">
        <span style={{ fontFamily: "var(--font-mono)" }}>
          pagina {page + 1} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Proxima
          </Button>
        </div>
      </footer>

      <ContactEditDialog
        open={!!editing}
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={(v) =>
          updateMut.mutate({
            data: { id: v.id, name: v.name, tags: v.tags },
          })
        }
        saving={updateMut.isPending}
      />
    </div>
  );
}