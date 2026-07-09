import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CrmValues {
  tags: string[];
  lead_value_cents: number | null;
  lead_value_currency: string;
  lead_value_note: string | null;
  lead_outcome: "won" | "lost" | null;
}

export function formatBRL(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function CrmPanel(props: {
  initial: CrmValues;
  pending: boolean;
  onSave: (patch: Partial<CrmValues>) => void;
}) {
  const [tags, setTags] = useState<string[]>(props.initial.tags);
  const [tagInput, setTagInput] = useState("");
  const [valueText, setValueText] = useState<string>(
    props.initial.lead_value_cents != null
      ? String((props.initial.lead_value_cents / 100).toFixed(2)).replace(".", ",")
      : "",
  );
  const [note, setNote] = useState(props.initial.lead_value_note ?? "");
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(
    props.initial.lead_outcome,
  );

  useEffect(() => {
    setTags(props.initial.tags);
    setValueText(
      props.initial.lead_value_cents != null
        ? String((props.initial.lead_value_cents / 100).toFixed(2)).replace(".", ",")
        : "",
    );
    setNote(props.initial.lead_value_note ?? "");
    setOutcome(props.initial.lead_outcome);
  }, [
    props.initial.tags,
    props.initial.lead_value_cents,
    props.initial.lead_value_note,
    props.initial.lead_outcome,
  ]);

  function addTag(raw: string) {
    const clean = raw.trim().toLowerCase();
    if (!clean || clean.length > 32) return;
    if (tags.includes(clean)) return;
    const next = [...tags, clean].slice(0, 12);
    setTags(next);
    setTagInput("");
    props.onSave({ tags: next });
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    props.onSave({ tags: next });
  }

  function commitValue() {
    const clean = valueText.replace(/\./g, "").replace(",", ".").trim();
    if (!clean) {
      props.onSave({ lead_value_cents: null });
      return;
    }
    const num = Number(clean);
    if (!Number.isFinite(num) || num < 0) return;
    props.onSave({ lead_value_cents: Math.round(num * 100) });
  }

  function toggleOutcome(v: "won" | "lost") {
    const next = outcome === v ? null : v;
    setOutcome(next);
    props.onSave({ lead_outcome: next });
  }

  return (
    <div
      className="flex w-[280px] shrink-0 flex-col gap-4 border-l border-border/60 bg-muted/5 p-4"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          ficha do lead
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          tags
        </label>
        <div className="flex flex-wrap gap-1">
          {tags.length === 0 ? (
            <span className="text-xs text-muted-foreground">sem tags</span>
          ) : (
            tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => removeTag(t)}
                className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                title="clique para remover"
              >
                {t} ×
              </button>
            ))
          )}
        </div>
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(tagInput);
            }
          }}
          onBlur={() => tagInput && addTag(tagInput)}
          placeholder="nova tag + enter"
          className="h-8 text-xs"
          disabled={props.pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          valor do lead (BRL)
        </label>
        <Input
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitValue();
            }
          }}
          placeholder="0,00"
          inputMode="decimal"
          className="h-8 text-xs"
          disabled={props.pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          nota
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => props.onSave({ lead_value_note: note })}
          placeholder="ex: notebook i5, urgencia media"
          rows={3}
          maxLength={280}
          className="text-xs"
          disabled={props.pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          resultado
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={outcome === "won" ? "default" : "outline"}
            onClick={() => toggleOutcome("won")}
            className={cn("flex-1 text-xs")}
            disabled={props.pending}
          >
            ganho
          </Button>
          <Button
            type="button"
            size="sm"
            variant={outcome === "lost" ? "default" : "outline"}
            onClick={() => toggleOutcome("lost")}
            className="flex-1 text-xs"
            disabled={props.pending}
          >
            perdido
          </Button>
        </div>
      </div>
    </div>
  );
}