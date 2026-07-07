# LDK Audit Log - Substituto n8n WhatsApp

Registro compacto iniciado quando Audit log: on foi habilitado.

## intake - projeto completo
- Command: ldk-intake
- User intent: registrar contexto completo baseado em spec detalhado (secao 0-13) e preparar para roadmap ordenado por dependencia.
- State before: projeto vazio (apenas tela "Iniciar").
- Actions: criada estrutura ldk/, gravado project.md com produto/plataforma/riscos/MVP/regras/[VERIFY], ledger.md com F1-F7 em idea, roadmap.md inicial com ordem do spec e bloqueios.
- Files changed: ldk/project.md, ldk/ledger.md, ldk/roadmap.md, ldk/audit/log.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: intake pronto
- Known limitations: MVP grande (7 features F1-F7, varias alto risco). Roadmap real deve ser consolidado com /ldk-roadmap. Nenhuma feature pode sair de idea sem habilitar Lovable Cloud + fornecer secrets.
- Next: /ldk-roadmap

## intake - design system F0
- Command: ldk-intake
- User intent: acrescentar sistema de design (dark terminal/HUD, laranja neon, glass cards, Space Grotesk/JetBrains Mono/Inter) ao intake.
- State before: ledger com F1-F7 em idea; sem feature de design.
- Actions: adicionada F0 (design system) no ledger com risk baixo/P1; roadmap reordenado com F0 antes de F1; project.md ganhou secao "Design system (F0)" com paleta OKLCH, tipografia, tratamentos permitidos e lista de proibicoes (flicker/shimmer/blink/scanline/marquee/orbit/animacao sobre texto).
- Files changed: ldk/ledger.md, ldk/roadmap.md, ldk/project.md, ldk/audit/log.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: intake atualizado
- Known limitations: nenhum CSS/fonte aplicado ainda; implementacao real acontece no build de F0.
- Next: /ldk-roadmap para reconsolidar ou /ldk-plan F0 para planejar o design system.

## plan - F0 design system
- Command: ldk-plan
- User intent: planejar F0 (design system dark terminal/HUD) antes de construir.
- State before: F0 em idea no ledger; sem brief/plan.
- Actions: criados ldk/features/f0-design-system/brief.md e plan.md com 5 tasks (tokens+@theme, fontes+dark, utilitarios, home visual, prova P1); ledger F0 movido idea -> planned aguardando aprovacao.
- Files changed: ldk/features/f0-design-system/brief.md, ldk/features/f0-design-system/plan.md, ldk/ledger.md, ldk/audit/log.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: planned
- Known limitations: plano ainda nao aprovado; nenhum codigo tocado.
- Next: aprovacao do usuario para mover F0 para approved, depois /ldk-build F0.

## build+proof - F0 design system
- Command: ldk-build
- User intent: aprovar F0 e executar build+prova.
- State before: F0 planned, 5 tasks ready.
- Actions: aplicados tokens OKLCH dark-first + @theme fonts + utilitarios .glass-card/.hud-brackets/.bg-hud-grid/::selection em src/styles.css; adicionadas fontes Google via <link> preconnect+stylesheet e className="dark"/lang="pt-BR" no <html> de src/routes/__root.tsx; refeita home em src/routes/index.tsx com bg-hud-grid + glass card + brackets + dot laranja + tipografia display/mono. Prova P1 executada via Playwright (screenshot /tmp/browser/f0/home.png + inspecao runtime da fonte, classe e background).
- Files changed: src/styles.css, src/routes/__root.tsx, src/routes/index.tsx, ldk/features/f0-design-system/proof.md, ldk/features/f0-design-system/plan.md, ldk/ledger.md, ldk/audit/log.md
- Evidence: preview yes; manual yes; tests na; console yes; diff na
- Decision: DONE
- Known limitations: hydration mismatch em data-tsd-source (ruido do dev HMR do template, nao introduzido por F0); .light so tem tokens sem toggle funcional (fora de escopo).
- Next: /ldk-next (provavelmente F1 - base schema + secrets + layout, que depende de habilitar Lovable Cloud).

## plan - F1 base
- Command: ldk-plan
- User intent: planejar F1 (base schema + secrets + layout com sidebar) e aprovar.
- State before: F1 idea; Cloud habilitado; F0 done.
- Actions: criados ldk/features/f1-base/brief.md e plan.md com 6 tasks (T1 workspaces+trigger, T2 10 tabelas dominio, T3 5 secrets, T4 shell+sidebar HUD, T5 8 rotas placeholder, T6 proof P3); ledger F1 idea -> approved apos aprovacao do usuario ("Aprovado"). Modo recomendado: ldk-build-task.
- Files changed: ldk/features/f1-base/brief.md, ldk/features/f1-base/plan.md, ldk/ledger.md, ldk/audit/log.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: approved
- Known limitations: RLS via workspace default (sem login v1) - aceita conscientemente; secrets ainda podem estar ausentes na hora de T3.
- Next: /ldk-build-task T1 (migracao workspaces + trigger).

## build-task - F1 T1
- Command: ldk-build-task
- User intent: executar T1 (workspaces + trigger + policy default).
- State before: F1 approved; T1 ready.
- Actions: migracao criou funcao `public.update_updated_at_column()`, helper `public.default_workspace_id()`, tabela `public.workspaces` (name, slug), GRANTs, RLS on, policy `workspaces_default_only_all` (id = default), trigger updated_at, seed da linha default `00000000-...-000001`.
- Files changed: migracao Supabase, ldk/features/f1-base/plan.md, ldk/ledger.md, ldk/audit/log.md
- Evidence: preview na; manual yes (psql SELECT retornou 1 linha default); tests na; console na; diff na
- Decision: proof-pending
- Known limitations: policy aberta a anon dentro do workspace default - aceita para v1 sem login; linter formal roda no proof da feature (T6).
- Next: /ldk-build-task T2 (migracao 10 tabelas dominio).

## build-task - F1 T2
- Command: ldk-build-task
- User intent: executar T2 (10 tabelas de dominio).
- State before: F1 building; T1 proof-pending; T2 ready.
- Actions: migracao criou `connections`, `agents`, `contacts`, `conversations`, `messages`, `templates`, `spreadsheets`, `spreadsheet_rows`, `campaigns`, `campaign_recipients` com id/workspace_id (default = default_workspace_id())/created_at/updated_at, FKs para workspaces e entre elas, GRANTs anon/authenticated/service_role, RLS on, policy workspace-default por tabela, trigger updated_at por tabela, indices em messages(conversation_id, created_at), spreadsheet_rows(spreadsheet_id, row_index) e campaign_recipients(campaign_id, status), UNIQUE (workspace_id, phone) em contacts.
- Files changed: migracao Supabase, ldk/features/f1-base/plan.md, ldk/audit/log.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: proof-pending
- Known limitations: policies abertas a anon dentro do workspace default (aceito v1); types.ts sera regenerado apos aprovacao/rodagem; linter formal roda em T6.
- Next: /ldk-build-task T3 (registrar 5 secrets).

## build-task - F1 T3
- Command: ldk-build-task
- User intent: registrar os 5 secrets do F1.
- State before: F1 building; T3 ready; apenas LOVABLE_API_KEY presente.
- Actions: gerado `WEBHOOK_VERIFY_TOKEN` (64 chars) via generate_secret. Decidido com o usuario: (1) manter `OPENAI_API_KEY` como opcao ao lado do Lovable AI Gateway com seletor na UI; (2) `ELEVENLABS_API_KEY` adiado (nao usado agora); (3) `EVOLUTION_BASE_URL` + `EVOLUTION_API_KEY` + `OPENAI_API_KEY` serao preenchidos pelo usuario na tela de Configuracoes (F7), nao registrados como secrets nesta task.
- Files changed: ldk/features/f1-base/plan.md, ldk/audit/log.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: partial
- Known limitations: apenas 2 dos 5 secrets registrados (LOVABLE_API_KEY ja existia; WEBHOOK_VERIFY_TOKEN gerado agora). EVOLUTION_BASE_URL, EVOLUTION_API_KEY, OPENAI_API_KEY e ELEVENLABS_API_KEY ficam pendentes ate a tela de Configuracoes existir (F7) ou o usuario decidir registra-los. AC3 fica parcial ate la; nao bloqueia T4/T5/T6.
- Next: /ldk-build-task T4 (shell + sidebar HUD).

## build-task - F1 T4
- Command: ldk-build-task
- User intent: shell + sidebar HUD (T4).
- State before: F1 building; T3 partial; T4 ready.
- Actions: criado `src/components/app-sidebar.tsx` (shadcn Sidebar collapsible=icon, 8 itens Dashboard/Conexoes/Agentes/Conversas/Contatos/Planilhas/Disparos/Configuracoes, item ativo via useRouterState, header com dot laranja, tipografia display/mono F0). Criado `src/routes/_shell.tsx` (pathless layout + SidebarProvider + SidebarTrigger no header + Outlet dentro de `.bg-hud-grid`). Removida `src/routes/index.tsx` standalone e criada `src/routes/_shell.index.tsx` como dashboard placeholder em `/` (o pathless `_shell` sem filhos conflitava com index no route tree; mover home para dentro do shell resolveu). Dev server reiniciado; routeTree.gen.ts regenerado com `_shell` e `_shell.index`. Playwright: screenshot `/tmp/browser/f1t4/home.png` mostra sidebar HUD, item Dashboard ativo, header trigger, grid HUD e card `EM CONSTRUCAO // F7`.
- Files changed: src/components/app-sidebar.tsx, src/routes/_shell.tsx, src/routes/_shell.index.tsx (delete src/routes/index.tsx), ldk/features/f1-base/plan.md, ldk/audit/log.md
- Evidence: preview yes; manual yes (screenshot); tests na; console yes (hydration mismatch antigo em data-tsd-source, ruido HMR do template, nao introduzido por T4); diff na
- Decision: proof-pending
- Known limitations: os 7 itens da sidebar apontam para rotas que so serao criadas em T5 (`/conexoes`, `/agentes`, etc.); cliques la agora dao 404. Redirect explicito `/` -> `/dashboard` foi substituido por home dentro do shell (`_shell.index.tsx`) para nao brigar com o pathless layout - registrado no plan.
- Next: /ldk-build-task T5 (rotas placeholder das 7 secoes restantes).

## build+proof - F1 T5+T6
- Command: ldk-build
- User intent: finalizar F1 executando T5 e T6 e provar.
- State before: F1 building; T1/T2/T4 proof-pending; T3 partial; T5/T6 ready.
- Actions: removido `_shell.index.tsx`; criado `src/components/hud-placeholder.tsx` compartilhado; criadas 8 rotas placeholder `_shell.{dashboard,conexoes,agentes,conversas,contatos,planilhas,disparos,configuracoes}.tsx` com head() PT-BR unico; criado `src/routes/index.tsx` com beforeLoad redirect para `/dashboard`. Dev server reiniciado; routeTree.gen.ts regenerou com 8 fullPaths esperados. Proof P3: supabase--linter -> `No linter issues found`; read_query listou 11 tabelas em public; Playwright rodou as 8 rotas + `/` (title/h1 unicos, redirect `/`->`/dashboard`, zero pageerror). proof.md escrito.
- Files changed: src/routes/index.tsx, src/routes/_shell.dashboard.tsx, src/routes/_shell.conexoes.tsx, src/routes/_shell.agentes.tsx, src/routes/_shell.conversas.tsx, src/routes/_shell.contatos.tsx, src/routes/_shell.planilhas.tsx, src/routes/_shell.disparos.tsx, src/routes/_shell.configuracoes.tsx, src/components/hud-placeholder.tsx (delete src/routes/_shell.index.tsx), ldk/features/f1-base/proof.md, ldk/features/f1-base/plan.md, ldk/ledger.md, ldk/audit/log.md
- Evidence: preview yes; manual yes; tests pass (Playwright); console yes; diff na
- Decision: PARTIAL
- Known limitations: AC3 partial (3 de 5 secrets pendentes ate F7 - Evolution/OpenAI/ElevenLabs); policies RLS abertas ao anon dentro do workspace default; hydration mismatch antigo do template.
- Next: continuar com F2 (Evolution + Conexoes) ou voltar depois em F7 para fechar secrets. Rode /ldk-next.