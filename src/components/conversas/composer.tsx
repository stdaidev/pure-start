import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer(props: {
  disabled: boolean;
  pending: boolean;
  onSend: (text: string) => Promise<void> | void;
  hint?: string;
}) {
  const { disabled, pending, onSend, hint } = props;
  const [value, setValue] = useState("");

  async function submit() {
    const t = value.trim();
    if (!t || disabled || pending) return;
    await onSend(t);
    setValue("");
  }

  return (
    <div className="border-t border-border/60 p-3">
      {disabled ? (
        <p
          className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {hint ?? "assuma a conversa para responder manualmente"}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={disabled || pending}
          placeholder={disabled ? "" : "digite uma resposta"}
          rows={2}
          className="min-h-[60px] flex-1 resize-none"
        />
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || pending || value.trim().length === 0}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {pending ? "enviando" : "enviar"}
        </Button>
      </div>
    </div>
  );
}