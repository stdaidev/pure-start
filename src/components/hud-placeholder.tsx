export function Placeholder({ title, feature }: { title: string; feature: string }) {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="glass-card hud-brackets px-12 py-10 text-center">
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          modulo // {feature}
        </p>
        <h1
          className="mt-3 text-4xl font-semibold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        <p
          className="mt-4 text-sm text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          EM CONSTRUCAO // {feature}
        </p>
      </div>
    </div>
  );
}