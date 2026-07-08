import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listProviderSecrets,
  upsertProviderSecret,
  type ProviderSecretName,
} from "@/lib/secrets.functions";

const PROVIDER_META: Record<
  ProviderSecretName,
  { label: string; hint: string; required?: boolean }
> = {
  EVOLUTION_BASE_URL: {
    label: "Evolution — URL base",
    hint: "Ex.: https://evo.exemplo.com (sem barra final).",
    required: true,
  },
  EVOLUTION_API_KEY: {
    label: "Evolution — API key global",
    hint: "AUTHENTICATION_API_KEY do servidor Evolution.",
    required: true,
  },
  OPENAI_API_KEY: {
    label: "OpenAI — API key",
    hint: "Usado pelo LLM provider `openai`.",
  },
  ELEVENLABS_API_KEY: {
    label: "ElevenLabs — API key",
    hint: "Opcional. Audio TTS.",
  },
};

export function ProviderSecretsSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listProviderSecrets);
  const upsertFn = useServerFn(upsertProviderSecret);
  const q = useQuery({
    queryKey: ["provider-secrets"],
    queryFn: () => listFn(),
  });

  const upsert = useMutation({
    mutationFn: (v: { name: ProviderSecretName; value: string }) =>
      upsertFn({ data: v }),
    onSuccess: (r) => {
      toast.success(`${r.name}: salvo (${r.masked})`);
      qc.invalidateQueries({ queryKey: ["provider-secrets"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao salvar"),
  });

  return (
    <section className="rounded border border-border/60 bg-muted/10 p-4">
      <h2 className="text-sm font-semibold">Provedores</h2>
      <p className="mt-1 text-xs text-muted-foreground max-w-xl">
        Chaves de API dos provedores externos. Ficam somente no backend
        (nunca no bundle do navegador). Alteracao aplica no proximo tick
        (ate 30s), sem restart.
      </p>

      <div className="mt-4 divide-y divide-border/60">
        {q.isLoading ? (
          <p className="py-4 text-xs text-muted-foreground">Carregando…</p>
        ) : q.isError ? (
          <p className="py-4 text-xs text-red-400">Falha ao listar secrets.</p>
        ) : (
          q.data?.map((row) => (
            <SecretRow
              key={row.name}
              name={row.name as ProviderSecretName}
              meta={PROVIDER_META[row.name as ProviderSecretName]}
              configured={row.configured}
              masked={row.masked}
              source={row.source}
              saving={upsert.isPending}
              onSave={(value) =>
                upsert.mutate({ name: row.name as ProviderSecretName, value })
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

function SecretRow({
  name,
  meta,
  configured,
  masked,
  source,
  saving,
  onSave,
}: {
  name: ProviderSecretName;
  meta: { label: string; hint: string; required?: boolean };
  configured: boolean;
  masked: string;
  source: string;
  saving: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{meta.label}</p>
          {configured ? (
            <span
              className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-300"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              ● {source === "env" ? "env" : "configurado"}
            </span>
          ) : (
            <span
              className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-amber-300"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              ● faltando
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
        {configured && !editing ? (
          <p
            className="mt-1 text-xs tabular-nums text-muted-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            valor: {masked}
          </p>
        ) : null}
      </div>

      {editing ? (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`s-${name}`} className="text-xs">
              Novo valor
            </Label>
            <Input
              id={`s-${name}`}
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-64"
              placeholder="cole aqui"
            />
          </div>
          <Button
            size="sm"
            disabled={saving || value.length === 0}
            onClick={() => {
              onSave(value);
              setValue("");
              setEditing(false);
            }}
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setValue("");
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          {configured ? "Trocar" : "Configurar"}
        </Button>
      )}
    </div>
  );
}