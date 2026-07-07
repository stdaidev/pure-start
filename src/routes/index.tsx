import { createFileRoute } from "@tanstack/react-router";

// Landing curta que aponta para o dashboard. Vira redirect real quando T5
// registrar /dashboard como rota tipada; usar <a href> aqui evita quebrar
// o typecheck enquanto as rotas placeholder de T5 nao existem.
export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="bg-hud-grid relative flex min-h-screen items-center justify-center bg-background px-6">
      <div className="glass-card hud-brackets px-12 py-10 text-center">
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          shell ready
        </p>
        <h1
          className="mt-3 text-4xl font-semibold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Iniciar
        </h1>
        <a
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Abrir dashboard
        </a>
      </div>
    </main>
  );
}