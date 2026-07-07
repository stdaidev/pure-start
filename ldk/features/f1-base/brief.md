# F1 - Base: schema Postgres + secrets + layout com sidebar

## Objetivo
Fundacao que F2-F7 vao consumir: schema completo com RLS + workspace default, secrets registrados, e shell de UI com sidebar HUD e rotas placeholder para as 8 secoes.

## Usuario
Operador unico. Sem login v1. App abre direto no shell.

## Escopo
- Migracao Postgres: `workspaces` + 10 tabelas de dominio + trigger `updated_at` + RLS + GRANT + policies workspace-default.
- Registrar 5 secrets: `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `WEBHOOK_VERIFY_TOKEN`.
- Shell: sidebar fixa HUD (shadcn/ui sidebar + lucide + tokens F0), 8 itens de navegacao, rotas placeholder.

## Fora de escopo
- Login/auth real (estrutura preparada, sem UI).
- Logica de negocio F2-F7.
- Edge Functions (entram em F2).
- Rota `_authenticated` (sem login v1).

## Decisoes fixadas
- `workspace_id` em toda tabela, default = `00000000-0000-0000-0000-000000000001` (linha semeada em `workspaces`).
- RLS ligada; policy unica `TO anon, authenticated USING (workspace_id = default) WITH CHECK (...)`.
- Trigger `public.update_updated_at_column()` compartilhada.
- Sidebar HUD sobre tokens F0.

## Risco
alto (migracao + RLS + secrets sensiveis)

## Prova minima
P3 (script SQL reproduzivel + Playwright screenshots das 8 rotas)

## Riscos e mitigacoes
- RLS aberta ao `anon`: aceita conscientemente para v1 sem login. Migracao para `auth.uid()` quando login for adicionado.
- Secrets ausentes: T3 nao bloqueia UI. Se faltar valor, T3 fica `blocked` e F1 fecha `PARTIAL`.
- Migracao grande: dividida em duas (T1 workspaces/trigger, T2 dominio).
- Sidebar SSR: usar `<ClientOnly>` ou wrapper se `useSidebar` quebrar.

## Dependencias
- Lovable Cloud habilitado (ok).
- F0 done (ok).