## 2026-07-07 - ldk-plan approve - F3

## 2026-07-07 - ldk-build T10+T11 - F3
- Command: ldk-build
- User intent: finalizar F3 (UI conexoes com agente default + ignore_groups e prova).
- State before: T10/T11 ready.
- Actions: `listConnections` retorna `default_agent_id`/`ignore_groups`; UI `/conexoes` ganhou select de agente default e switch `Ignorar grupos` por linha (usa `setConnectionAgent`/`setConnectionIgnoreGroups`). Playwright smoke em `/agentes` e `/conexoes` (screenshots ok). `supabase--linter` limpo. Escrito `ldk/features/f3-runtime-agente/proof.md`.
- Files changed: src/lib/connections.functions.ts, src/routes/_shell.conexoes.tsx, ldk/features/f3-runtime-agente/proof.md, ldk/features/f3-runtime-agente/plan.md
- Evidence: preview yes; manual yes (smoke); tests na; console no (so hydration source-tag warning inofensivo); diff na
- Decision: PARTIAL
- Known limitations: curl E2E do webhook nao rodado (precisa OPENAI_API_KEY em runtime real); grep de segredo no bundle depende de build do harness (protecao estrutural: leitura dentro do handler em `.server.ts`).
- Next: rodar E2E com credencial real ou avancar para F4 (inbox humano).

## 2026-07-07 - ldk-build-task T9 - F3
- Command: ldk-build-task
- User intent: UI /agentes com CRUD, toggle active, humanizacao.
- State before: T9 ready.
- Actions: substituido placeholder de /agentes por lista HUD (glass-card) com toggle active, edit e delete; novo componente `AgentDialog` com form (nome, modelo select, temperatura slider, system_prompt textarea, tools multiselect [resetar, transferir_humano], humanizacao chunk+min/max ms sliders, ativo). Usa server functions de T8 via useServerFn/useQuery/useMutation. T9 -> proof-pending.
- Files changed: src/routes/_shell.agentes.tsx, src/components/agentes/agent-dialog.tsx, ldk/features/f3-runtime-agente/plan.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: proof-pending
- Known limitations: Playwright E2E do CRUD fica no T11 (prova P4). Vinculo agente<->conexao vem no T10.
- Next: `/ldk-build-task T10` (UI conexoes: select agente default).

## 2026-07-07 - ldk-build-task T8 - F3
- Command: ldk-build-task
- User intent: server functions dos agentes (+ vinculo com conexao).
- State before: T8 ready.
- Actions: criado src/lib/agents.functions.ts com listAgents/getAgent/saveAgent/deleteAgent/toggleAgent/setConnectionAgent/setConnectionIgnoreGroups. Zod valida entrada; supabaseAdmin lazy-load; sem log de content. T8 -> proof-pending.
- Files changed: src/lib/agents.functions.ts, ldk/features/f3-runtime-agente/plan.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: proof-pending
- Known limitations: prova UI (CRUD) vem no T9; typecheck completo no T11.
- Next: `/ldk-build-task T9` (UI /agentes).

## 2026-07-07 - ldk-build-task T7 - F3
- Command: ldk-build-task
- User intent: acionar runtime no webhook; ignorar grupos; aceitar base64.
- State before: T7 ready.
- Actions: migration adiciona `connections.ignore_groups` (default true); webhook filtra JID `@g.us` por conexao; apos insert de inbound text, chama `runAgentForMessage` com Promise.race timeout 12s e nunca falha o 200. Registro do webhook ja acontecia no `createInstance` do Evolution (webhook.base64=true).
- Files changed: supabase/migrations/*, src/routes/api/public/evolution.webhook.ts, ldk/features/f3-runtime-agente/plan.md
- Evidence: preview na; manual na (curl fica no T11); tests na; console na; diff na
- Decision: proof-pending
- Known limitations: base64 de media inbound ainda nao propagado para `messages` (fora do escopo v1: audio/imagem serao F3.1). UI para toggle `ignore_groups` na conexao vem no T10.
- Next: `/ldk-build-task T8` (server functions dos agentes).

## 2026-07-07 - ldk-build-task T6 - F3
- Command: ldk-build-task
- User intent: runtime runAgentForMessage server-only.
- State before: T6 ready.
- Actions: criado src/lib/agent-runtime.server.ts com guards (outbound loop, humano, agent.active, sem agente, sem conexao), reset command "/resetar", historico apos ultimo marker (limit 20), tool loop (max 2 rounds), humanizacao (chunk+sleep) com cap 12s, envio via EvolutionProvider, persistencia outbound. Sem log de content.
- Files changed: src/lib/agent-runtime.server.ts, ldk/features/f3-runtime-agente/plan.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: proof-pending
- Known limitations: hook no webhook e prova E2E ficam em T7/T11.
- Next: `/ldk-build-task T7` (hook no webhook Evolution).

## 2026-07-07 - ldk-build-task T5 - F3
- Command: ldk-build-task
- User intent: registry de tools server-only (resetar, transferir_humano).
- State before: T5 ready.
- Actions: criado src/providers/tools/registry.server.ts com Zod-validated handlers; supabaseAdmin lazy-load. T5 -> proof-pending.
- Files changed: src/providers/tools/registry.server.ts, ldk/features/f3-runtime-agente/plan.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: proof-pending
- Known limitations: prova de execucao real (curl mock) fica no T11.
- Next: `/ldk-build-task T6` (runtime runAgentForMessage).

## 2026-07-07 - ldk-build-task T4 - F3
- Command: ldk-build-task
- User intent: OpenAIProvider server-only (fetch chat completions).
- State before: T4 ready.
- Actions: criado src/providers/llm/openai.server.ts com timeout 12s, max_tokens 800, sem log de content, key lida em process.env dentro da funcao. Auto-registra no registry.
- Files changed: src/providers/llm/openai.server.ts, ldk/features/f3-runtime-agente/plan.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: proof-pending
- Known limitations: grep no bundle client sera feito no T11 (prova final).
- Next: `/ldk-build-task T5` (registry de tools server-only).

## 2026-07-07 - ldk-build-task T3 - F3
- Command: ldk-build-task
- User intent: contrato LLMProvider + tipos + registry.
- State before: T3 ready.
- Actions: criados src/providers/llm/types.ts e src/providers/llm/registry.ts (client-safe, sem side-effects). T3 -> proof-pending.
- Files changed: src/providers/llm/types.ts, src/providers/llm/registry.ts, ldk/features/f3-runtime-agente/plan.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: proof-pending
- Known limitations: implementacao concreta OpenAI vem em T4.
- Next: `/ldk-build-task T4` (OpenAIProvider server-only).

## 2026-07-07 - ldk-build-task T2 - F3
- Command: ldk-build-task
- User intent: migration F3 (agents.tools/humanization, connections.default_agent_id, conversation_markers). Modelo default confirmado: gpt-4.1-mini.
- State before: T1 proof-pending; T2 ready.
- Actions: migration aplicada com sucesso; supabase--linter limpo; brief atualizado (modelo gpt-4.1-mini); T2 ready -> proof-pending.
- Files changed: supabase/migrations/*, ldk/features/f3-runtime-agente/plan.md, ldk/features/f3-runtime-agente/brief.md
- Evidence: preview na; manual yes (linter clean); tests na; console na; diff na
- Decision: proof-pending
- Known limitations: types.ts regenerado pelo sistema; ainda faltam T3-T11.
- Next: `/ldk-build-task T3` (contrato LLMProvider + tipos).

## 2026-07-07 - ldk-build-task T1 - F3
- Command: ldk-build-task
- User intent: coletar OPENAI_API_KEY.
- State before: T1 blocked.
- Actions: usuario adicionou OPENAI_API_KEY via add_secret; T1 blocked -> proof-pending. Modelo default assumido `gpt-4o-mini` (aguarda confirmacao no proof).
- Files changed: ldk/features/f3-runtime-agente/plan.md
- Evidence: preview na; manual yes (fetch_secrets lista OPENAI_API_KEY); tests na; console na; diff na
- Decision: proof-pending
- Known limitations: modelo default `gpt-4o-mini` [VERIFY] pendente.
- Next: `/ldk-build-task T2` (migration agents.tools/humanization + connections.default_agent_id + conversation_markers).

## 2026-07-07 - ldk-plan approve - F3
- Command: ldk-plan
- User intent: aprovar plano F3.
- State before: F3 planned.
- Actions: ledger F3 planned -> approved.
- Files changed: ldk/ledger.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: approved
- Known limitations: T1 blocked ate OPENAI_API_KEY.
- Next: `/ldk-build-task T1` (coletar OPENAI_API_KEY).

## 2026-07-07 - ldk-plan - F3
- Command: ldk-plan
- User intent: planejar F3 runtime do agente + modulo Agentes.
- State before: F3 idea; F2 done.
- Actions: brief.md + plan.md criados; ledger F3 idea -> planned.
- Files changed: ldk/features/f3-runtime-agente/brief.md, ldk/features/f3-runtime-agente/plan.md, ldk/ledger.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: planned
- Known limitations: T1 blocked ate coleta de OPENAI_API_KEY; modelo default a confirmar.
- Next: aprovar plano -> `/ldk-build-task T1` (coletar OPENAI_API_KEY).

## 2026-07-07 - ldk-plan - f2-conexoes
- Command: ldk-plan
- User intent: planejar F2 (Contratos + EvolutionProvider + modulo Conexoes)
- State before: F2 idea no ledger
- Actions: criado brief.md e plan.md com 7 tasks; ledger F2 -> approved
- Files changed: ldk/features/f2-conexoes/brief.md, ldk/features/f2-conexoes/plan.md, ldk/ledger.md
- Evidence: preview na; manual na; tests not run; console na; diff na
- Decision: approved
- Known limitations: EVOLUTION_BASE_URL/EVOLUTION_API_KEY ainda nao coletados (T1)
- Next: /ldk-build-task T1 (coletar segredos F2)

## 2026-07-07 - ldk-build-task - f2-conexoes T2
- Command: ldk-build-task
- User intent: implementar contrato ChannelProvider (T1 adiada para F7 config)
- State before: F2 approved, T1 blocked (segredos), T2 ready
- Actions: criados src/providers/channel/types.ts (ChannelProvider + tipos QR/Status/Message/Webhook) e src/providers/channel/registry.ts (registro client-safe por id); typecheck limpo. Plan: T1 -> blocked, T2 -> proof-pending.
- Files changed: src/providers/channel/types.ts, src/providers/channel/registry.ts, ldk/features/f2-conexoes/plan.md
- Evidence: preview na; manual na; tests: tsgo verde; console na; diff na
- Decision: proof-pending
- Known limitations: T1 segredos EVOLUTION_* adiados para tela F7; T3 (EvolutionProvider real) fica blocked ate T1 destravar.
- Next: /ldk-build-task T3 fica blocked; recomendado avancar F1 T3 (secrets via F7) ou seguir outra frente. Rode /ldk-next.

## 2026-07-07 - ldk-build-task - f2-conexoes T3
- Command: ldk-build-task
- User intent: implementar EvolutionProvider server-only (secrets ja registradas pelo usuario)
- State before: F2 building, T2 proof-pending, T1 done, T3 ready
- Actions: criado src/providers/channel/evolution.server.ts com createInstance/getQrCode/getStatus/sendText/sendAudio/deleteInstance/handleWebhook, timeouts 5s via AbortController, mapState/extractQr helpers, sem log de PII/apikey. typecheck limpo.
- Files changed: src/providers/channel/evolution.server.ts, ldk/features/f2-conexoes/plan.md
- Evidence: preview na (server-only); manual na; tests: tsgo verde; console na; diff na
- Decision: proof-pending
- Known limitations: nao chamou Evolution real ainda (validacao E2E fica em T4/T7). Contrato de webhook baseado em MESSAGES_UPSERT/CONNECTION_UPDATE do Evolution 2.3.7.
- Next: /ldk-build-task T4 (server functions createConnection/getStatus/refreshQr/deleteConnection).

## 2026-07-07 - ldk-build-task - f2-conexoes T4
- Command: ldk-build-task
- User intent: implementar server functions do modulo Conexoes
- State before: F2 building, T3 proof-pending
- Actions: criado src/lib/connections.functions.ts com createConnection/getConnectionStatus/refreshQr/deleteConnection/listConnections. supabaseAdmin e evolutionProvider carregados via dynamic import dentro do handler (client-safe). Webhook URL derivado via getRequest(). Zod input validators, sem log de PII/QR/apikey. instance_name nullable guardado com throw explicito.
- Files changed: src/lib/connections.functions.ts, ldk/features/f2-conexoes/plan.md
- Evidence: preview na; manual na; tests: tsgo verde; console na; diff na
- Decision: proof-pending
- Known limitations: server fns sao publicas (sem auth v1); Evolution real ainda nao chamado end-to-end. T5 (webhook publico) precisa revisao de seguranca antes de commit.
- Next: /ldk-build-task T5 (server route publica /api/public/evolution/webhook).

## 2026-07-07 - ldk-build - f2-conexoes T5
- Command: ldk-build (checkpoint T5)
- User intent: implementar webhook publico com seguranca
- State before: F2 building, T4 proof-pending
- Actions: migration cria public.webhook_events (service_role only, RLS on, GRANT service_role) + unique parcial em messages(external_id); rota /api/public/evolution/webhook valida x-webhook-token via timingSafeEqual sobre hashes sha256, persiste em webhook_events, delega parse para EvolutionProvider.handleWebhook, projeta em contacts/conversations/messages com idempotencia (select-then-insert por external_id), retorna 200/401 sem PII.
- Files changed: supabase migration (webhook_events + idx_messages_external_id), src/routes/api/public/evolution.webhook.ts, ldk/features/f2-conexoes/plan.md
- Evidence: preview na; manual: curl localhost -> 401 com token errado, 200 com token correto; tests not run; console: sem PII; diff na. Persistencia verificada via read_query: webhook_event processed=true, contact/conversation/message criados, duplicata nao cria segunda linha.
- Decision: proof-pending
- Known limitations: rotas server-fn de T4 nao foram exercidas E2E (fica em T6/T7). Restaram 3 contatos/conversas/mensagens de teste (MSG_LDK_TEST_*) porque read_query e read-only; podem ser removidos em migration futura ou pelo usuario. Precisa configurar URL do webhook no Evolution Manager apontando para {published}/api/public/evolution/webhook com header x-webhook-token=WEBHOOK_VERIFY_TOKEN.
- Next: /ldk-build-task T6 (UI /conexoes com listagem, modal nova conexao, QR polling).
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
## 2026-07-07 - ldk-build-task T6 - F2 Conexoes
- Command: ldk-build-task
- User intent: implementar UI `/conexoes` com lista, modal QR, polling e acoes
- State before: T6 ready; T2-T5 proof-pending
- Actions: rota `/conexoes` real (lista + estado vazio), `NewConnectionDialog` com QR e polling `useQuery` refetchInterval 3s (para quando `connected`/`error`), `StatusBadge` HUD, `QrDisplay` (aceita raw base64 ou data URL), acoes refresh/delete via `useServerFn` + `useMutation`, `Toaster` sonner montado em `__root`.
- Files changed: src/routes/_shell.conexoes.tsx, src/routes/__root.tsx, src/components/conexoes/status-badge.tsx, src/components/conexoes/qr-display.tsx, src/components/conexoes/new-connection-dialog.tsx, ldk/features/f2-conexoes/plan.md, ldk/audit/log.md
- Evidence: preview no; manual no; tests not run; console na; diff na (tsgo verde)
- Decision: proof-pending
- Known limitations: sem Playwright end-to-end nesta task (fica para T7); depende de Evolution real para QR aparecer.
- Next: /ldk-build-task T7 para prova P4.

## 2026-07-07 - ldk-build-task T7 - F2 Conexoes (proof P4)
- Command: ldk-build-task
- User intent: prova P4 e fechamento de F2
- State before: T2-T6 proof-pending; T7 ready
- Actions: Playwright em /conexoes (lista renderiza estado vazio "NENHUMA INSTANCIA"); curl webhook (wrong=401, none=401, correct=200) persistindo connection.update em webhook_events processed=true; supabase--linter "No linter issues found"; `bun run build` verde; `grep -r EVOLUTION_API_KEY dist/client/` -> 0 (server-only em dist/server/_ssr). Escrito proof.md. Plan T2-T7 -> done. Ledger F2 -> done.
- Files changed: ldk/features/f2-conexoes/proof.md, ldk/features/f2-conexoes/plan.md, ldk/ledger.md, ldk/audit/log.md
- Evidence: preview yes; manual yes (curl+screenshot); tests not run; console yes; diff no
- Decision: DONE
- Known limitations: fluxo QR real WhatsApp nao exercido; endpoints publicos sem auth (v1); CSRF middleware nao configurado (warning dev).
- Next: /ldk-next (candidato F3 runtime do agente).
