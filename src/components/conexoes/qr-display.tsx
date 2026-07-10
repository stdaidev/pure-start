export function QrDisplay({ base64 }: { base64: string | null | undefined }) {
  if (!base64) {
    return (
      <div className="flex h-64 w-64 items-center justify-center rounded-sm border border-dashed border-border/60 bg-muted/10">
        <span
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          aguardando qr...
        </span>
      </div>
    );
  }
  const src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  return (
    <div className="rounded-sm border border-border/60 bg-white p-3">
      <img src={src} alt="QR code WhatsApp" className="h-64 w-64" />
    </div>
  );
}
