import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MappingTable } from "@/components/planilhas/mapping-table";
import {
  parseSheet,
  suggestMapping,
  type FieldRole,
  type ParsedSheet,
} from "@/lib/contacts-parse";
import { normalizePhone, snakeCase } from "@/lib/phone";
import { importContacts } from "@/lib/contacts.functions";

export const Route = createFileRoute("/_shell/planilhas")({
  head: () => ({
    meta: [
      { title: "Planilhas // HUD" },
      { name: "description", content: "Upload de CSV/XLSX e headers." },
    ],
  }),
  component: PlanilhasPage,
});

type Step = "upload" | "map" | "preview";

type PreparedRow = {
  phone: string;
  name: string | null;
  email: string | null;
  tags: string[];
  metadata: Record<string, string>;
};

function prepare(
  sheet: ParsedSheet,
  mapping: Record<string, FieldRole>,
): { valid: PreparedRow[]; invalid: number } {
  const valid: PreparedRow[] = [];
  let invalid = 0;
  for (const row of sheet.rows) {
    let phoneRaw = "";
    let name: string | null = null;
    let email: string | null = null;
    const tags: string[] = [];
    const metadata: Record<string, string> = {};
    for (const h of sheet.headers) {
      const role = mapping[h] ?? "placeholder";
      const v = row[h] ?? "";
      if (!v) continue;
      if (role === "phone") phoneRaw = v;
      else if (role === "name") name = v;
      else if (role === "email") email = v;
      else if (role === "tags") {
        for (const t of v.split(/[,;|]/)) {
          const trimmed = t.trim();
          if (trimmed) tags.push(trimmed);
        }
      } else if (role === "placeholder") {
        metadata[snakeCase(h)] = v;
      }
    }
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      invalid++;
      continue;
    }
    valid.push({ phone, name, email, tags, metadata });
  }
  return { valid, invalid };
}

function PlanilhasPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, FieldRole>>({});
  const [parsing, setParsing] = useState(false);

  const importFn = useServerFn(importContacts);
  const importMut = useMutation({
    mutationFn: importFn,
    onSuccess: (r) => {
      toast.success(
        `Import: ${r.created} novos, ${r.updated} atualizados, ${r.opt_outs_preserved} opt-outs preservados`,
      );
      navigate({ to: "/contatos" });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao importar"),
  });

  const prepared = useMemo(
    () => (sheet ? prepare(sheet, mapping) : { valid: [], invalid: 0 }),
    [sheet, mapping],
  );

  const phoneMapped = Object.values(mapping).includes("phone");

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const parsed = await parseSheet(file);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error("Planilha vazia ou invalida");
        return;
      }
      setFileName(file.name);
      setSheet(parsed);
      setMapping(suggestMapping(parsed.headers));
      setStep("map");
    } catch {
      toast.error("Nao foi possivel ler o arquivo");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 p-6">
      <header>
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
          Planilhas
        </h1>
        <p
          className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
          data-testid="wizard-step"
        >
          passo {step === "upload" ? "1/3 upload" : step === "map" ? "2/3 mapeamento" : "3/3 preview"}
        </p>
      </header>

      {step === "upload" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded border border-dashed border-border/60 p-10 text-center">
          <p className="text-sm">Selecione um arquivo .csv ou .xlsx</p>
          <Input
            type="file"
            accept=".csv,.xlsx"
            className="w-80"
            disabled={parsing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <p
            className="text-[10px] uppercase tracking-widest text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            parse ocorre no navegador; nada e enviado ainda
          </p>
        </div>
      ) : null}

      {step === "map" && sheet ? (
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <p className="text-xs text-muted-foreground">
            Arquivo: <span style={{ fontFamily: "var(--font-mono)" }}>{fileName}</span> — {sheet.rows.length} linhas
          </p>
          <div className="flex-1 overflow-auto">
            <MappingTable
              headers={sheet.headers}
              sample={sheet.rows.slice(0, 5)}
              mapping={mapping}
              onChange={(h, role) =>
                setMapping((m) => ({ ...m, [h]: role }))
              }
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Voltar
            </Button>
            <Button
              disabled={!phoneMapped}
              onClick={() => setStep("preview")}
            >
              {phoneMapped ? "Continuar" : "Mapeie o telefone"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "preview" && sheet ? (
        <div className="flex flex-1 flex-col gap-3">
          <div
            className="grid grid-cols-4 gap-3"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Stat label="total validos" value={prepared.valid.length} />
            <Stat label="invalidos" value={prepared.invalid} />
            <Stat label="linhas lidas" value={sheet.rows.length} />
            <Stat label="colunas mapeadas" value={Object.values(mapping).filter((r) => r !== "ignorar" && r !== "placeholder").length} />
          </div>
          <div className="flex-1 overflow-auto rounded border border-border/60">
            <table className="w-full text-sm">
              <thead
                className="border-b border-border/60 bg-muted/30 text-left text-[10px] uppercase tracking-widest text-muted-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <tr>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Tags</th>
                  <th className="px-3 py-2">Placeholders</th>
                </tr>
              </thead>
              <tbody>
                {prepared.valid.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td
                      className="px-3 py-2 text-xs"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {r.phone}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{r.email ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.tags.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {Object.keys(r.metadata).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("map")}>
              Voltar
            </Button>
            <Button
              disabled={prepared.valid.length === 0 || importMut.isPending}
              onClick={() =>
                importMut.mutate({
                  data: {
                    rows: prepared.valid,
                    spreadsheet: sheet
                      ? {
                          name: fileName || "planilha",
                          headers: sheet.headers,
                          rawRows: sheet.rows,
                        }
                      : undefined,
                  },
                })
              }
            >
              {importMut.isPending
                ? "Importando..."
                : `Confirmar import (${prepared.valid.length})`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/60 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {props.label}
      </p>
      <p className="text-xl font-semibold">{props.value}</p>
    </div>
  );
}