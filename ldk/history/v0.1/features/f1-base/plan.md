# F1 - Base: schema + secrets + layout com sidebar - Plan

## Feature
F1 - Base: schema Postgres + secrets + layout com sidebar

## Risk
alto

## Proof required
P3

## Cerimonia
alto - plano completo, checkpoint por task, prova reproduzivel.

## Modo de execucao recomendado
`ldk-build-task` (risco alto: migracao + RLS + secrets sensiveis, prefere checkpoint por task).

## Acceptance criteria
- AC1: Migracao cria `workspaces` + as 10 tabelas de dominio, todas com `id/workspace_id/created_at/updated_at`, RLS ativa, GRANT correto, trigger `updated_at` funcionando. Linter Supabase sem erros novos.
- AC2: Existe uma linha em `public.workspaces` com id default; queries `SELECT` de cada tabela via anon key retornam sem erro de permissao.
- AC3: Os 5 secrets registrados: `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `WEBHOOK_VERIFY_TOKEN`.
- AC4: App renderiza layout com sidebar fixa a esquerda com 8 itens (Dashboard, Conexoes, Agentes, Conversas, Contatos, Planilhas, Disparos, Configuracoes) em estilo HUD. Sidebar destaca item ativo e pode colapsar.
- AC5: Cada uma das 8 rotas carrega sem erro, tem `<title>` proprio via `head()`, e mostra placeholder HUD ("EM CONSTRUCAO // Fx"). Home `/` aponta para `/dashboard`.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migracao 01: `workspaces` + seed default + trigger `update_updated_at_column` compartilhada + helper `default_workspace_id()`. RLS + policy `id = default_workspace_id()` + GRANT para `anon`, `authenticated`, `service_role`. | AC1, AC2 | migration via supabase--migration | `psql` confirma linha default `00000000-...-000001`; linter no proof | done |
| T2 | Migracao 02: 10 tabelas de dominio (`connections`, `agents`, `contacts`, `conversations`, `messages`, `templates`, `spreadsheets`, `spreadsheet_rows`, `campaigns`, `campaign_recipients`) com colunas base + campos minimos do spec (ex.: `connections.status`, `messages.direction/content/media_url`, `campaigns.status/schedule`, `campaign_recipients.status`). RLS + policies workspace-default + GRANT + FKs + trigger `updated_at` em cada uma. | AC1, AC2 | migration via supabase--migration | `information_schema.tables` lista as 10; linter limpo | done |
| T3 | Registrar/solicitar os 5 secrets via `secrets--fetch_secrets` + `secrets--add_secret`. Nao inventar valores. | AC3 | (backend secrets) | `secrets--fetch_secrets` lista os 5 nomes | partial |
| T4 | Layout com sidebar HUD + componente `app-sidebar` + redirect `/` -> `/dashboard`. | AC4, AC5 | `src/routes/_shell.tsx`, `src/routes/index.tsx`, `src/components/app-sidebar.tsx` | Preview: sidebar HUD, item ativo destacado | done |
| T5 | 8 rotas placeholder sob `_shell` com head() PT-BR e card HUD compartilhado. | AC5 | `src/routes/_shell.*.tsx`, `src/components/hud-placeholder.tsx` | Playwright: 8 rotas com title/h1 unicos, sem pageerror | done |
| T6 | Prova P3: linter Supabase + `information_schema.tables` + Playwright nas 8 rotas + redirect da home. `proof.md` escrito. | AC1-AC5 | `ldk/features/f1-base/proof.md`, `/tmp/browser/f1/screenshots/*.png` | Linter clean, 11 tabelas, 8 screenshots, redirect ok | done |

## Arquivos criados/alterados (esperados)
- migrations Supabase (via tool)
- src/routes/_shell.tsx
- src/routes/_shell.dashboard.tsx
- src/routes/_shell.conexoes.tsx
- src/routes/_shell.agentes.tsx
- src/routes/_shell.conversas.tsx
- src/routes/_shell.contatos.tsx
- src/routes/_shell.planilhas.tsx
- src/routes/_shell.disparos.tsx
- src/routes/_shell.configuracoes.tsx
- src/routes/index.tsx
- src/components/app-sidebar.tsx
- ldk/features/f1-base/brief.md (criado)
- ldk/features/f1-base/plan.md (criado)
- ldk/features/f1-base/proof.md (criado no build)

## Fora de escopo
- Login/auth real.
- Logica de negocio F2-F7.
- Edge Functions.

## Roadmap/dependencias
- Lovable Cloud habilitado (ok).
- F0 done (ok).

## Status no ledger
idea -> planned -> approved (aprovado pelo usuario).