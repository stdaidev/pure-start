# F6 - Disparos - Proof

## Resumo
`/disparos` lista campanhas, `NewCampaignDialog` cria via wizard 4 passos (conexao+planilha -> template com preview -> anti-ban -> resumo) e navega para `/disparos/$id`. Monitor mostra badge de status, contadores (enviados/pendentes/falhas/opt-out), telefones mascarados e controles Ativar/Pausar/Cancelar com realtime em `campaign_recipients`/`campaigns`. Worker `runDispatchTick` roda via rota `/api/public/dispatch/tick` autenticada por `apikey` e agendado por `pg_cron` 1/min.

## Pre-flight
Otimista: reuso completo de `campaigns` + `campaign_recipients` ja existentes, provider Evolution ja funcional, wizard herda padroes de F5, anti-ban isolado em util pura.
Pessimista: `_shell.disparos.$id.tsx` exigia layout com `<Outlet />` no parent — corrigido movendo lista para `_shell.disparos.index.tsx` e criando shell com `<Outlet />` em `_shell.disparos.tsx`. Prova de envio real (`sent`) evitada intencionalmente para nao gastar reputacao das instancias `cliente`/`vendedor` durante o teste.
Decisao: proceed com prova P4 sem executar sendText contra Evolution real.

## AC cobertos
- AC1: `/disparos` lista campanhas com nome, status, progresso e criada em, desc por `created_at`. Screenshot `1_list_empty.png` (estado inicial) e `6_monitor_draft.png` (lista com "F6 Proof" apos wizard).
- AC2: Wizard 4 passos executado com sucesso. Screenshots `2_wizard_step1.png` (conexao+planilha), `3_wizard_step2.png` (template + preview live com placeholder `{{nome}}` substituido), `4_wizard_step3.png` (anti-ban min/max/cap/janela), `5_wizard_step4.png` (resumo). `createCampaign` inseriu 2 recipients (verificado via `SELECT ... FROM campaign_recipients`).
- AC3: `updateCampaignStatus` chamado via botoes Ativar (draft->running, screenshot `7_monitor_running.png` badge RODANDO), Pausar (running->paused, `8_monitor_paused.png` badge PAUSADA), Cancelar (->canceled, `9_monitor_canceled.png` badge CANCELADA).
- AC4: Codigo do worker em `src/lib/dispatch-worker.server.ts` implementa: filtra `status=running`, checa `isWithinWindow` (SP), calcula `dailyCapRemaining` com warm-up, claim `pending->sending`, dupla checagem opt-out em `contacts`, `evolutionProvider.sendText`, atualiza recipient (`sent|failed|skipped_optout`), incrementa `sent_today`/`sent_today_date`, `sleep` bounded [min_ms,max_ms]<=15s. Rota `/api/public/dispatch/tick` retorna 401 sem `apikey` (`curl` sem header e com header errado retornaram `401 Unauthorized` — evidencia no log de execucao). Job pg_cron `dispatch_tick_every_min` (`* * * * *`) criado em T9 chamando `pg_net.http_post` com URL preview + `apikey`.
- AC5: `/disparos/$id` renderiza cabecalho + `CampaignStatusBadge` + 4 cards (enviados/pendentes/falhas/opt-out) + tabela paginada. `useCampaignRealtime(id)` inscreve canal `f6-campaign-<id>` em `postgres_changes` para invalidar queries. Screenshot `7_monitor_running.png` mostra `pendentes=2` refletindo os recipients criados.
- AC6: `renderTemplate` guarda o texto em `campaign_recipients.variables.rendered_text` (nao em coluna dedicada e nao logado). Worker so loga `error` truncado em 200 chars sem telefone/rendered_text. `evolutionProvider` ja tinha regra de nao logar apikey/texto. Nenhum handler de `campaigns.functions.ts` imprime PII em erro.
- AC7: Kill-switch demonstrado: apos Ativar (running), Pausar mudou para `paused`; codigo do worker re-checa `campaigns.status` antes de cada envio (`if (fresh?.status !== "running") break;`).
- AC8: `bunx tsgo --noEmit` verde. Playwright cobriu wizard->criar->ativar->pausar->cancelar sem `pageerror`; unico erro de console e o hydration warning de `data-tsd-source` do template (mesmo warning documentado em F5). NAO executamos tick com sendText mockado dentro do playwright (ver limitacoes).

## Provas executadas
- Seed `spreadsheets` + `spreadsheet_rows` com 2 linhas (`5511900000001`, `5511900000002`) via `supabase--insert`.
- Playwright `/tmp/browser/f6/run.py` executou wizard completo, criou campanha (`Campanha criada: 2 destinatarios` no toast), navegou para `/disparos/{id}`, transicionou status draft->running->paused->canceled com screenshots por passo em `/tmp/browser/f6/screenshots/`.
- `curl -X POST http://localhost:8080/api/public/dispatch/tick` sem `apikey` -> `401 Unauthorized`; com `apikey: wrong` -> `401 Unauthorized`. Rejeicao confirmada com `timingSafeEqual` de SHA-256.
- `SELECT status, count(*) FROM campaign_recipients WHERE campaign_id=...` retornou `2 pending` (recipients criados corretamente).
- Job pg_cron: `SELECT * FROM cron.job` mostra `dispatch_tick_every_min` (agendado em T9).

## Veredito otimista
Fluxo end-to-end de UI completo e observado. Autenticacao do endpoint validada duas vezes (sem header e com header errado). Recipients criados e status transicionam via UI. Realtime, mascara de telefone e kill-switch por status implementados.

## Veredito pessimista
- Nao executamos o "happy path" `sent=success` porque isso exigiria enviar mensagens reais via Evolution para as instancias `cliente`/`vendedor`. Deliberadamente deixado para verificacao manual pos-release com numero de teste real, conforme o proprio plano ja previa ("teste com numero real fica manual pos-release").
- Cron job foi criado apontando para a URL preview `project--...-dev.lovable.app` + `apikey`. Antes do release, T9 documenta trocar para `.lovable.app` (URL de producao).
- Hydration warning de `data-tsd-source` persiste (nao regressao de F6, ja presente em F5).

## Checklist de seguranca / anti-ban
- [x] `/api/public/dispatch/tick` autentica via `apikey` (SUPABASE_PUBLISHABLE_KEY); rejeita sem header e com header errado (evidencia: curl 401).
- [x] Nenhum log contem telefone/rendered_text — worker so loga `error` truncado; handlers so lancam mensagem generica.
- [x] Opt-out em `createCampaign` (via `contacts.opt_out`) e no worker (dupla checagem em cada tick).
- [x] Janela `America/Sao_Paulo` fixa v1, documentada em `anti-ban.ts`.
- [x] `min_ms` default 8000 (>=3s); UI mostra aviso se `<3000`.
- [x] `daily_cap` default 200.
- [x] Warm-up opcional (`warmup_per_day` * dias ativos).
- [x] Kill-switch: status re-checado antes de cada envio; transicoes paused/canceled testadas via UI.
- [x] `service_role` (`supabaseAdmin`) importado apenas dentro de `.handler()` de `campaigns.functions.ts` e da rota `dispatch.tick.ts` — nunca em modulo compartilhado.

## LDK self-check
- Tasks essenciais T1-T9 em `proof-pending` (implementadas), T10 = ready -> agora `done` com esta prova.
- Preview aberto: sim.
- Console checado: sim (hydration warning inofensivo).
- Testes automatizados: playwright ok, sem vitest para o worker (limitacao).
- Diff GitHub: nao verificado nesta skill.

## Status
PARTIAL — implementacao completa e provada em UI/API; happy-path `sent=success` do worker deixado para verificacao manual pos-release com numero de teste real (conforme plano). Sem novos riscos abertos.

## Etapa concluida
Prova F6 registrada; aguardando proximo comando.