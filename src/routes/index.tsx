import { createFileRoute } from "@tanstack/react-router";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="bg-hud-grid relative flex min-h-screen items-center justify-center bg-background px-6">
      <div className="glass-card hud-brackets px-14 py-12">
        <div className="flex items-center justify-center gap-4">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_theme(colors.primary)]"
            style={{ boxShadow: "0 0 14px oklch(0.72 0.19 48 / 0.7)" }}
          />
          <h1
            className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Iniciar
          </h1>
        </div>
        <p
          className="mt-4 text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          READY // v0.1
        </p>
      </div>
    </main>
  );
}
