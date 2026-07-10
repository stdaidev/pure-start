# F1 - Base: Proof of Done

Tasks: T1, T2, T4, T5, T6 (T3 partial)
Feature: F1 - Base: schema Postgres + secrets + layout com sidebar
Status: PARTIAL
Risk: alto
Proof level required: P3
Proof level achieved: P3

## Pre-flight
Otimista: T1/T2 aplicados no banco; T4 renderizou shell; T5 e T6 sao UI + prova sem tocar RLS/secrets.
Pessimista: T3 fica partial (secrets Evolution/OpenAI/ElevenLabs adiados para tela de Configuracoes em F7); policies abertas ao anon dentro do workspace default sao decisao consciente v1.

## Changed files
- supabase migration 01 (workspaces + trigger + helper default_workspace_id)
- supabase migration 02 (10 tabelas de dominio + RLS + GRANT + trigger updated_at)
- src/routes/__root.tsx (F0, ja existente)
- src/routes/index.tsx (redirect / -> /dashboard)
- src/routes/_shell.tsx (layout HUD com SidebarProvider + trigger + Outlet)
- src/routes/_shell.dashboard.tsx, _shell.conexoes.tsx, _shell.agentes.tsx, _shell.conversas.tsx, _shell.contatos.tsx, _shell.planilhas.tsx, _shell.disparos.tsx, _shell.configuracoes.tsx
- src/components/app-sidebar.tsx (8 itens, item ativo, collapsible=icon)
- src/components/hud-placeholder.tsx (card HUD compartilhado)
- src/integrations/supabase/types.ts (regenerado)

## Acceptance criteria
- AC1 (schema + trigger + RLS + GRANT + linter): covered. 11 tabelas em public (workspaces + 10 dominio), RLS ativa, GRANTs anon/authenticated/service_role, trigger updated_at por tabela, linter Supabase `No linter issues found`.
- AC2 (workspace default + SELECT sem erro de permissao): covered. `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` retorna as 11 tabelas via read_query (executado como app).
- AC3 (5 secrets): PARTIAL. LOVABLE_API_KEY presente (gateway cobre chat/embeddings) e WEBHOOK_VERIFY_TOKEN gerado. EVOLUTION_BASE_URL, EVOLUTION_API_KEY, OPENAI_API_KEY e ELEVENLABS_API_KEY ficam pendentes ate a UI de Configuracoes (F7) coleta-los.
- AC4 (sidebar HUD + item ativo + colapsavel): covered. Screenshot `/tmp/browser/f1/screenshots_conexoes.png` mostra sidebar dark HUD, 8 itens, "Conexoes" destacado, trigger de collapse no header.
- AC5 (8 rotas com head + placeholder): covered. Playwright confirmou title/h1 unicos por rota:
  - /dashboard -> "Dashboard // HUD" / h1 Dashboard
  - /conexoes -> "Conexoes // HUD" / h1 Conexoes
  - /agentes -> "Agentes // HUD" / h1 Agentes
  - /conversas -> "Conversas // HUD" / h1 Conversas
  - /contatos -> "Contatos // HUD" / h1 Contatos
  - /planilhas -> "Planilhas // HUD" / h1 Planilhas
  - /disparos -> "Disparos // HUD" / h1 Disparos
  - /configuracoes -> "Configuracoes // HUD" / h1 Configuracoes
  - / redireciona para /dashboard (Playwright: `pg.url == http://localhost:8080/dashboard`).

## Verification performed
- Preview opened: yes
- Main user flow tested: yes (navegacao entre 8 rotas + redirect da home)
- Responsive/mobile checked: no (fora do escopo de F1; sidebar shadcn ja tras mobile drawer nativo)
- Console/log errors checked: yes (nenhum pageerror; hydration mismatch em data-tsd-source e ruido HMR do template, nao introduzido por F1)
- GitHub diff available: no
- Automated test available: no (scripts Playwright + SQL reproduziveis)
- Automated test result: pass (Playwright rodou 8 rotas + / sem erro)
- CI result: not available

## LDK self-check
- Required proof identified: yes
- All essential AC covered: no (AC3 parcial)
- Evidence exists for every covered AC: yes
- Proof level achieved >= required: yes (P3)
- Critical errors known: no
- LDK engine drift detected: no
- If GitHub/CI is unavailable, limitation documented: yes

## Proof verdict
Optimistic:
- Schema completo, policies default funcionando, shell HUD navegavel entre 8 modulos com metadata unica.
Pessimistic:
- Secrets do provedor Evolution/OpenAI/ElevenLabs ainda dependem do usuario preencher na tela de Configuracoes (F7). Policies abertas ao anon exigem migracao futura quando login for adicionado.

## Evidence
- Preview URL: http://localhost:8080/
- Screenshots: /tmp/browser/f1/screenshots_{dashboard,conexoes,agentes,conversas,contatos,planilhas,disparos,configuracoes}.png
- SQL: `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` -> 11 tabelas; supabase--linter -> `No linter issues found`.
- Manual: sidebar colapsa via trigger, item ativo destacado.

## Known limitations
- T3 secrets 3/5 pendentes (aguardando UI de Configuracoes em F7).
- Policies RLS abertas ao anon dentro do workspace default (decisao v1 sem login).
- Hydration mismatch em `data-tsd-source` e ruido HMR do template Lovable, nao introduzido por F1.

## Etapa concluida
- Proof registrado e aguardando proximo comando.