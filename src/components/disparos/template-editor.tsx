import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { renderTemplate, extractPlaceholders } from "@/lib/template-render";

export function TemplateEditor(props: {
  value: string;
  onChange: (v: string) => void;
  sample: Record<string, unknown> | null;
}) {
  const { value, onChange, sample } = props;
  const placeholders = useMemo(() => extractPlaceholders(value), [value]);
  const preview = useMemo(
    () => renderTemplate(value, sample ?? {}),
    [value, sample],
  );
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label
          className="text-[10px] uppercase tracking-widest text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          template
        </label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          placeholder="Ola {{nome}}, tudo bem?"
          style={{ fontFamily: "var(--font-mono)" }}
        />
        <p className="text-[10px] text-muted-foreground">
          placeholders: {placeholders.length ? placeholders.join(", ") : "nenhum"}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label
          className="text-[10px] uppercase tracking-widest text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          preview (1a linha)
        </label>
        <div
          className="min-h-[240px] whitespace-pre-wrap rounded border border-border/60 bg-muted/20 p-3 text-sm"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {sample ? preview.text || <span className="text-muted-foreground">(vazio)</span> : (
            <span className="text-muted-foreground">Selecione uma planilha para ver o preview.</span>
          )}
        </div>
        {preview.missing.length > 0 && sample ? (
          <p className="text-[10px] text-amber-400">
            placeholders sem valor: {preview.missing.join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}