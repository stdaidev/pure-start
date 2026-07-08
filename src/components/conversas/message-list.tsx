import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface MessageItem {
  id: string;
  direction: string;
  content: string | null;
  media_type: string | null;
  status: string;
  created_at: string;
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageList(props: {
  messages: MessageItem[];
  hasAgent: boolean;
  assigned: boolean;
}) {
  const { messages, hasAgent, assigned } = props;
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-xs text-muted-foreground"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        sem mensagens
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {messages.map((m) => {
        const isOut = m.direction === "outbound";
        const aiTag = isOut && hasAgent && !assigned;
        const body = m.content ?? (m.media_type ? `[${m.media_type}]` : "—");
        return (
          <div
            key={m.id}
            className={cn(
              "flex flex-col gap-1",
              isOut ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                isOut
                  ? "bg-primary/20 text-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{body}</p>
            </div>
            <div
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {aiTag ? <span className="text-primary">IA</span> : null}
              <span>{fmtTime(m.created_at)}</span>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}