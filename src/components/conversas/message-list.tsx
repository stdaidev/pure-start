import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface MessageItem {
  id: string;
  direction: string;
  content: string | null;
  media_url: string | null;
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
              <MessageBody message={m} fallback={body} />
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

function MessageBody(props: { message: MessageItem; fallback: string }) {
  const { message, fallback } = props;
  const type = message.media_type?.toLowerCase() ?? null;

  if (message.media_url && type === "audio") {
    return (
      <div className="flex min-w-[260px] flex-col gap-2">
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}
        <audio controls preload="metadata" src={message.media_url} className="w-full" />
      </div>
    );
  }

  if (message.media_url && type === "image") {
    return (
      <div className="flex max-w-[320px] flex-col gap-2">
        <img
          src={message.media_url}
          alt={message.content ?? "Imagem recebida"}
          className="max-h-[360px] rounded-md object-contain"
          loading="lazy"
        />
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}
      </div>
    );
  }

  if (message.media_url && type === "video") {
    return (
      <div className="flex max-w-[360px] flex-col gap-2">
        <video controls preload="metadata" src={message.media_url} className="max-h-[360px] rounded-md" />
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}
      </div>
    );
  }

  if (message.media_url) {
    return (
      <a
        href={message.media_url}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline-offset-4 hover:underline"
      >
        abrir {message.media_type ?? "arquivo"}
      </a>
    );
  }

  return <p className="whitespace-pre-wrap break-words">{fallback}</p>;
}