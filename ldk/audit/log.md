## 2026-07-10 - schema migration - LDK 0.2.0
- Command: repository migration requested by the project owner
- User intent: corrigir integralmente o estado LDK e deixar o projeto pronto para os Knowledges/skills novos
- State before: LDK 0.1 sem discovery/schema/revision; 13 done, 3 partial, 5 planned; historico misturado ao backlog ativo
- Actions: snapshot anterior movido para `ldk/history/v0.1/`; discovery revision 1 reconstruido do intake/audit/codigo; project, ledger e roadmap recriados no schema 2; backlog ativo recebeu IDs canonicos
- Files changed: somente artefatos LDK e infraestrutura de validacao; nenhum codigo de produto nesta etapa
- Evidence: audit original, commit de cutoff `67fdfae`, estado do repositorio e checker LDK 0.2.0
- Decision: migracao estrutural; historico nao foi promovido nem usado para inventar novo DONE
- Known limitations: auth/RLS, credencial dos ticks, retencao LGPD e CI seguem como gates registrados
- Next: revisar/aprovar o plano F1 e executar conforme modo balanced com reducao guided por risco alto

## 2026-07-10 - migration verification - schema 2
- Command: LDK check Bash/PowerShell, `npm run build`, `npm run lint`
- State before: estado ativo recem-migrado; baseline de codigo nao alterada
- Evidence: checker Bash 0 errors/0 warnings; checker PowerShell 0 errors/0 warnings; production build pass; lint fail com 1.526 apontamentos herdados, majoritariamente Prettier
- Decision: migracao LDK aprovada; lint nao e declarado como prova nem corrigido junto para evitar diff massivo sem relacao com o schema
- Known limitations: sem test script; ambiente local Node 20 abaixo do requisito atual de alguns pacotes, embora build tenha passado; CI usa Bun
- Next: CI da branch e saneamento separado do lint antes de qualquer proof P3/P4

## 2026-07-08 - ldk-build corretivo - F8
- Command: ldk-build
- User intent: corrigir a propria F8, pois debounce/lock anterior nao resolveu duplicidade.
- State before: F8 partial; implementacao usava Map/setTimeout e advisory lock.
- Actions: trocado para debounce persistente em `conversations` (`agent_run_at`, `agent_running_since`, `agent_latest_message_id`), RPCs `schedule_agent_run`/`claim_due_agent_runs`/`release_agent_run`, webhook agenda no banco, nova rota `/api/public/agent/tick`, cron `agent_tick_every_5s` ativo.
- Files changed: supabase/migrations/20260708220232_f24f9ad9-afea-4ccd-8fd3-e3e46beea9b2.sql, src/routes/api/public/evolution.webhook.ts, src/routes/api/public/agent.tick.ts, src/lib/agent-runtime.server.ts, src/integrations/supabase/types.ts, ldk/features/f8-debounce-lock/brief.md, ldk/features/f8-debounce-lock/plan.md, ldk/features/f8-debounce-lock/proof.md, ldk/ledger.md
- Evidence: preview no; manual no; tests pass (`npx tsgo --noEmit`); console no; diff na; backend yes (colunas/RPCs/cron consultados; tick 401 sem apikey e 200 com apikey).
- Decision: PARTIAL
- Known limitations: teste real WhatsApp AC6 pendente; se Evolution usa URL publicada, publicar nova versao antes de validar externamente; cron atual aponta para URL preview/dev.
- Next: validar no WhatsApp com 4 mensagens em <2s e, se responder uma vez, rodar `/ldk-proof` ou `/ldk-release`.

## 2026-07-08 - ldk-release - release check
- Command: ldk-release
- User intent: rodar checklist de release apos F6.2 DONE
- State before: F6.2 done; F1/F3/F6/F6.1 partial; F7 idea
- Actions: gerado `ldk/releases/2026-07-08.md` com decisao NO-GO
- Files changed: ldk/releases/2026-07-08.md
- Evidence: preview yes; manual yes (F6.2); tests not run; console na; diff no
- Decision: NO-GO
- Known limitations: F1/F3/F6/F6.1 sem prova P3/P4; mobile nao checado; CI nao rodado
- Next: rodar `/ldk-proof` nas features partial ou aceitar soft-launch interno explicito
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

## 2026-07-08 - ldk-doctor - F3 reconciliacao
- Command: ldk-doctor
- User intent: registrar tudo e seguir
- State before: F3 ledger=approved, plan tasks=proof-pending, proof=parcial sem evidencia real
- Actions: ledger F3 -> partial + Last evidence; plan T1..T10 -> done, T11 -> proof-pending; proof.md atualizado com E2E manual do usuario (P2) e correcoes (idempotencia por conversation, sendTyping, URL publicada); roadmap consolidado.
- Files changed: ldk/ledger.md, ldk/features/f3-runtime-agente/plan.md, ldk/features/f3-runtime-agente/proof.md, ldk/roadmap.md
- Evidence: preview na; manual yes (usuario); tests not run; console na; diff na
- Decision: PARTIAL
- Known limitations: falta teste E2E automatizado e CI verificado para fechar P4 de F3
- Next: /ldk-plan F4 (Conversas/inbox + handoff)

## 2026-07-08 - ldk-plan - F4
- Command: ldk-plan
- User intent: planejar F4 Conversas/inbox + handoff
- State before: F4 idea, sem brief/plan
- Actions: brief.md e plan.md criados; ledger F4 -> approved; 6 tasks ready.
- Files changed: ldk/features/f4-conversas-handoff/brief.md, ldk/features/f4-conversas-handoff/plan.md, ldk/ledger.md
- Evidence: preview na; manual na; tests not run; console na; diff na
- Decision: planned
- Known limitations: media (audio/imagem) e multi-usuario fora de escopo v1
- Next: /ldk-build F4

## 2026-07-08 - ldk-build - F4
- Command: ldk-build
- User intent: executar F4 Conversas/inbox + handoff
- State before: F4 approved, plan com 6 tasks ready
- Actions: criou conversations.functions.ts, componentes conversa (list/messages/composer), hook realtime, substituiu placeholder de /conversas.
- Files changed: src/lib/conversations.functions.ts, src/hooks/use-conversations-realtime.ts, src/components/conversas/{conversation-list,message-list,composer}.tsx, src/routes/_shell.conversas.tsx, ldk/features/f4-conversas-handoff/{plan,proof}.md, ldk/ledger.md
- Evidence: preview yes (screenshots /tmp/browser/f4/1.png e 2_selected.png); manual na (nao disparou envio real); tests not run; console yes (sem pageerror); diff na
- Decision: DONE
- Known limitations: envio manual e realtime nao validados end-to-end via WhatsApp real
- Next: /ldk-next (F5 ou hardening F3)

## 2026-07-08 - ldk-plan - F5
- Command: ldk-plan
- User intent: planejar F5 Contatos e Planilhas
- State before: F5 idea, sem brief/plan
- Actions: brief.md e plan.md criados; ledger F5 -> approved; 7 tasks ready; decidido parse client-side com papaparse+xlsx.
- Files changed: ldk/features/f5-contatos-planilhas/brief.md, plan.md, ldk/ledger.md
- Evidence: preview na; manual na; tests not run; console na; diff na
- Decision: planned
- Known limitations: sem segmentos nomeados, sem sync CRM, sem enrichment.
- Next: /ldk-build F5

## 2026-07-08 - ldk-build - F5
- Command: ldk-build
- User intent: executar e provar F5 (Contatos e Planilhas)
- State before: F5 approved (P2)
- Actions: instalado papaparse+xlsx; criado phone.ts, contacts-parse.ts, contacts.functions.ts; substituido placeholders de /contatos e /planilhas; wizard 3 passos + import batch com merge de metadata e preservacao de opt_out; proof P2.
- Files changed: package.json, src/lib/phone.ts, src/lib/contacts-parse.ts, src/lib/contacts.functions.ts, src/routes/_shell.contatos.tsx, src/routes/_shell.planilhas.tsx, src/components/contatos/contact-edit-dialog.tsx, src/components/planilhas/mapping-table.tsx, ldk/features/f5-contatos-planilhas/proof.md, plan.md, ldk/ledger.md
- Evidence: preview yes; manual yes (upload CSV mock -> import -> contatos); tests not run; console yes (sem pageerror); diff na
- Decision: DONE
- Known limitations: xlsx aumenta bundle; email nao validado; busca so nome/telefone; tags nunca sao removidas no import (union).
- Next: /ldk-next

## 2026-07-08 - prompt-direto - F4 incremento
- Command: prompt (fora de skill LDK)
- User intent: separar inbox por numero e permitir nomear conexao
- State before: F4 done, F2 done
- Actions: /conversas ganhou chips de filtro por connection_id com contagem; ConversationListItem passou a expor connection_id/connection_name; listConversations passou a retornar connection_id.
- Files changed: src/routes/_shell.conversas.tsx, src/components/conversas/conversation-list.tsx, src/lib/conversations.functions.ts
- Evidence: preview na; manual na; tests not run; console na; diff na
- Decision: incremento sobre F4 done (AC originais intactos)
- Known limitations: nao ha teste automatizado do filtro; contagem depende do resultado atual (limit 200).
- Next: revalidar so se AC de F4 mudar.

## 2026-07-08 - prompt-direto - F2 incremento
- Command: prompt (fora de skill LDK)
- User intent: permitir renomear conexao
- State before: F2 done
- Actions: nova server fn renameConnection (Zod, workspace-scope); UI inline em /conexoes com click-to-edit + Pencil.
- Files changed: src/lib/connections.functions.ts, src/routes/_shell.conexoes.tsx
- Evidence: preview na; manual na; tests not run; console na; diff na
- Decision: incremento sobre F2 done (AC originais intactos)
- Known limitations: rename nao renomeia a instancia no Evolution (so o rotulo local).
- Next: se precisar refletir no provedor, criar F2.1.

## 2026-07-08 - prompt-direto - F2/F3 incremento
- Command: prompt (fora de skill LDK)
- User intent: sincronizar toggle "Ignorar grupos" com Evolution API
- State before: F2 done, F3 partial; toggle so persistia local
- Actions: novo `setSettings?()` em ChannelProvider; EvolutionProvider chama `POST /settings/set/{instance}` com `groups_ignore`/`groupsIgnore`; `setConnectionIgnoreGroups` faz sync best-effort com Evolution (falha no upstream nao bloqueia update local, so console.error server-side).
- Files changed: src/providers/channel/types.ts, src/providers/channel/evolution.server.ts, src/lib/agents.functions.ts
- Evidence: preview na; manual na; tests not run; console na; diff na
- Decision: incremento sobre F2/F3 done (AC originais intactos)
- Known limitations: sem retry/fila se Evolution estiver offline no momento do toggle; nao ha teste automatizado do sync.
- Next: revalidar so se AC de F2/F3 mudar.

## 2026-07-08 - prompt-direto - F4 incremento
- Command: prompt (fora de skill LDK)
- User intent: apagar conversa (mensagens + registro) na inbox
- State before: F4 done
- Actions: nova server fn `deleteConversation` (Zod, workspace-scope; apaga messages -> conversations); UI ganhou botao lixeira no header da conversa com AlertDialog de confirmacao; onSuccess limpa activeId e invalida ["conversations"].
- Files changed: src/lib/conversations.functions.ts, src/routes/_shell.conversas.tsx
- Evidence: preview na; manual na; tests not run; console na; diff na
- Decision: incremento sobre F4 done (AC originais intactos)
- Known limitations: delecao e hard-delete (nao soft-delete); nao apaga o contato; nao afeta o WhatsApp do usuario final.
- Next: revalidar so se AC de F4 mudar.

## 2026-07-08 - prompt-direto - F3 incremento
- Command: prompt (fora de skill LDK)
- User intent: expor max_tokens e max_tool_rounds por agente, com opcao de desligar (ilimitado)
- State before: F3 partial; runtime usava constantes fixas (max_tokens 800, MAX_TOOL_ROUNDS 2)
- Actions: migration adiciona `agents.max_tokens int` e `agents.max_tool_rounds int` (ambos nullable); runtime le os dois (null = ilimitado, teto interno HARD_MAX_TOOL_ROUNDS=20); OpenAIProvider so envia `max_tokens` quando definido; AgentDialog ganhou secao com Switch on/off + Slider para cada limite.
- Files changed: supabase migration (agents.max_tokens, agents.max_tool_rounds), src/lib/agents.functions.ts, src/lib/agent-runtime.server.ts, src/providers/llm/openai.server.ts, src/components/agentes/agent-dialog.tsx
- Evidence: preview na; manual na; tests not run; console na; diff na
- Decision: incremento sobre F3 partial (AC originais intactos; flexibiliza sem trocar contrato)
- Known limitations: sem validacao cruzada de custo/tempo se usuario setar ilimitado + modelo caro; teto de rounds em 20 e hardcoded no runtime, nao configuravel via UI.
- Next: revalidar so se AC de F3 mudar.

## 2026-07-08 - ldk-plan - F6 Disparos
- Command: ldk-plan
- User intent: planejar F6 (disparos com anti-ban) apos F5 done
- State before: F6 idea, F5 done, F3/F1 partial
- Actions: criado brief.md e plan.md em ldk/features/f6-disparos/; ledger F6 idea -> approved; escopo ajustado para reusar campaign_recipients (ja existente) em vez de campaign_targets
- Files changed: ldk/features/f6-disparos/brief.md, ldk/features/f6-disparos/plan.md, ldk/ledger.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: planned
- Known limitations: pg_net a confirmar em T9; timezone fixo America/Sao_Paulo v1; envio real via mock em T10
- Next: /ldk-build-task para T1 (migration anti-ban)

## 2026-07-08 - ldk-plan - F6.1
- Command: ldk-plan
- User intent: planejar hardening anti-ban do F6 com suporte a campanha single/multi-instancia
- State before: F6 partial no ledger; sem F6.1
- Actions: criado brief.md e plan.md de F6.1; ledger com nova linha F6.1 approved; roadmap atualizado
- Files changed: ldk/features/f6.1-anti-ban-hardening/brief.md, ldk/features/f6.1-anti-ban-hardening/plan.md, ldk/ledger.md, ldk/roadmap.md
- Evidence: preview na; manual na; tests na; console na; diff na
- Decision: approved (aguardando build)
- Known limitations: kill-switch e por workspace default (multi-workspace real ainda nao existe)
- Next: rodar ldk-build-task T1 (migration)

## 2026-07-08 - ldk-doctor - F6/F6.1
- Command: ldk-doctor
- User intent: catalogar emendas pos-F6 sem burocracia (Opcao A)
- State before: 4 mudancas pos-proof sem registro (tick manual, normalizeMsisdn, snippet erro, deleteCampaign)
- Actions: nota "Emendas pos-proof" em f6-disparos/proof.md; bloco "Estado atual do codigo" em f6.1/plan.md marcando botao manual como TEMPORARIO ate cron do release
- Files changed: ldk/features/f6-disparos/proof.md, ldk/features/f6.1-anti-ban-hardening/plan.md
- Evidence: na
- Decision: diagnosis-only + catalog
- Known limitations: botao "Disparar agora" segue visivel em preview; remover/flagar antes do release
- Next: ldk-build-task T1 de F6.1

## 2026-07-08 - ldk-build - F6.1
- Command: ldk-build
- User intent: executar F6.1 completo (T2-T8) apos T1
- State before: T1 proof-pending; T2-T8 ready
- Actions: workspace.functions.ts (kill-switch); createCampaign com dispatch_mode/connection_ids/hourly_limit/next_send_at escalonado; getCampaignConnections; dispatch-connection.server.ts (pickConnection round-robin); worker refatorado (skip paused, claim por next_send_at, hourly cap, retry, last_connection_id); stop-on-reply no evolution webhook; wizard com radio single/multi + multi-select + hourly_limit; monitor com badges/stopped_reply/coluna Conexao; /configuracoes com Switch kill-switch. Smoke playwright + 6 screenshots.
- Files changed: src/lib/workspace.functions.ts (novo), src/lib/dispatch-connection.server.ts (novo), src/lib/campaigns.functions.ts, src/lib/dispatch-worker.server.ts, src/routes/api/public/evolution.webhook.ts, src/components/disparos/new-campaign-dialog.tsx, src/components/disparos/status-badge.tsx, src/routes/_shell.disparos.$id.tsx, src/routes/_shell.configuracoes.tsx, ldk/features/f6.1-anti-ban-hardening/{plan.md,proof.md}, ldk/ledger.md
- Evidence: preview yes; manual yes (kill-switch + wizard multi); tests pass (tsgo); console yes (so hydration warning pre-existente); diff na
- Decision: PARTIAL (mesma politica do F6: sem envio real)
- Known limitations: 3 cenarios do AC11 (rotacao/stop-on-reply/hourly real) exigem instancia real
- Next: verificacao manual pos-release ou F7 (Dashboard + Configuracoes polimento)

## 2026-07-08 - ldk-build - F7 dashboard-config
- Command: ldk-build
- User intent: executar F7 aprovada (dashboard + configuracoes secrets + hide "Disparar agora")
- State before: F7 approved (P2); F1 partial
- Actions: migration workspace_secrets; secrets.server.ts + secrets.functions.ts; refactor providers para getSecret; dashboard.functions.ts; kpi-card + dashboard route real; provider-secrets section; hide "Disparar agora" com import.meta.env.DEV; proof.md; ledger F7 done + F1 done por efeito colateral
- Files changed: supabase/migrations/*workspace_secrets.sql; src/lib/secrets.server.ts; src/lib/secrets.functions.ts; src/lib/dashboard.functions.ts; src/providers/channel/evolution.server.ts; src/providers/llm/openai.server.ts; src/components/dashboard/kpi-card.tsx; src/components/configuracoes/provider-secrets.tsx; src/routes/_shell.dashboard.tsx; src/routes/_shell.configuracoes.tsx; src/routes/_shell.disparos.$id.tsx; ldk/features/f7-dashboard-config/{proof.md,dashboard.png,config.png}; ldk/ledger.md
- Evidence: preview yes; manual yes; tests na; console yes (hydration warnings pre-existentes); diff na
- Decision: DONE (P2) com [VERIFY] em AC5 e AC6
- Known limitations: secret em texto plano no DB (RLS + sem grant anon); cache 30s no getSecret; envio real apos troca de chave nao testado nesta sessao; botao "Disparar agora" some em prod nao validado em build final
- Next: /ldk-release ou /ldk-next
## 2026-07-10 - revisao-geral - runtime e operacao
- Command: revisao direta antes da atualizacao do LDK no Lovable
- User intent: revisar e corrigir o Pure Start, usando o audit log como contexto das decisoes anteriores
- State before: schema 2 migrado; F1/F2/F6 planned; build verde, lint herdado vermelho e sem testes automatizados
- Actions: ownership por token e revalidacao do agente; auth server-only dos ticks; resiliencia OpenAI/tools; hardening de webhook/logs; liberacao de reservas nos caminhos de skip/erro; workspace scope; rollback de campanha parcial; metadados; Node 22, testes, lint/typecheck/build no CI; runbook e security review
- Files changed: runtime/provider/routes/migration/testes/workflow/docs e estado LDK correspondente
- Evidence: typecheck pass; lint zero erros; testes unitarios pass; build pass; CI e prova Supabase aguardando commit/publicacao
- Decision: F1 PARTIAL/P4, F2 PARTIAL/P2, F6 PARTIAL/P4; nenhuma declaracao de DONE antes de staging/CI
- Known limitations: painel sem auth; secrets em texto plano; cotas por campanha ainda nao atomicas entre ticks; migration nao aplicada nesta sessao; LGPD pendente
- Next: publicar commit, observar CI, aplicar migration e atualizar tokens/jobs em ambiente controlado antes de trafego real

## 2026-07-10 - hardening - cota atomica de campanha
- Command: execucao direta dos itens 1-7 solicitados pelo owner
- User intent: fechar concorrencia, merge, migrations, ambiente, jobs, publicacao e smoke controlado
- State before: reserva por conexao atomica; contadores de campanha ainda sujeitos a corrida entre ticks
- Actions: criada reserva/compensacao transacional por campanha; worker passou a reservar antes do efeito e compensar todos os caminhos sem envio confirmado; protecao temporaria via login Lovable aceita pelo owner
- Files changed: migration de quota, worker, tipos, security review e estado/evidencia F6
- Evidence: typecheck pass; lint zero erros; 19 testes pass; prova concorrente remota ainda pendente
- Decision: F6 BUILDING/P4 ate migration, stress sem provider e CI
- Known limitations: auth interna do app, secrets em texto plano e LGPD permanecem fora desta execucao
- Next: publicar no PR, aguardar CI, mergear e aplicar/configurar o ambiente
