# F6 - Disparos - Plan

Feature: F6 - Disparos (wizard + template + anti-ban + worker pg_cron + monitor)
Risk: alto
Proof required: P4
Cerimonia: alto completa
Modo de execucao recomendado: `ldk-build-task` (checkpoint manual por task)

## Acceptance criteria
- AC1: `/disparos` lista campanhas (nome, status, conexao, progresso X/Y, criado_em) desc por created_at.
- AC2: Wizard 4 passos: (1) conexao+planilha, (2) template com preview substituido pela 1a linha valida, (3) anti-ban (min<=max, janela HH:MM-HH:MM, teto>=1), (4) resumo cria `campaigns` (status=draft) + N `campaign_recipients` (uma por contato, exceto opt-out).
- AC3: Botoes Ativar (draft/scheduled -> running), Pausar (running -> paused), Cancelar (-> canceled) via `updateCampaignStatus`.
- AC4: Worker pg_cron 1/min chama `/api/public/dispatch/tick`, processa apenas `running` dentro da janela, respeita teto diario, envia com intervalo aleatorio [min_ms,max_ms] via `evolutionProvider.sendText`, atualiza `campaign_recipients.status` (`sent|failed|skipped_optout`).
- AC5: `/disparos/$id` mostra contadores (enviados/falha/pendente/opt-out) e tabela paginada em tempo real (realtime supabase).
- AC6: Nenhum log expoe telefone/rendered_text/chaves - apenas ids e contadores.
- AC7: Kill-switch: mudar para paused/canceled interrompe envios da campanha no proximo tick.
- AC8: `bunx tsgo --noEmit` verde; playwright cobre wizard -> ativar -> tick com `sendText` mockado -> recipients=`sent`.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration: colunas anti-ban em `campaigns` (`min_ms`, `max_ms`, `daily_cap`, `window_start`, `window_end`, `warmup_per_day`, `sent_today`, `sent_today_date`); indice em `campaign_recipients(campaign_id,status)` se ausente; nao alterar RLS/GRANT existentes | AC2, AC4 | `supabase/migrations/*.sql` | supabase linter + tsgo | proof-pending |
| T2 | Server functions `campaigns.functions.ts`: `listCampaigns`, `getCampaign`, `createCampaign` (le `spreadsheet_rows` + `contacts`, filtra opt-out, renderiza template, insere `campaign_recipients` em batch), `updateCampaignStatus`, `listRecipients` paginado | AC1, AC2, AC3, AC7 | `src/lib/campaigns.functions.ts` | tsgo + chamada manual | ready |
| T3 | Util pura `renderTemplate(text, vars)` substitui `{{coluna}}` (case-insensitive, trim); reporta placeholders faltantes | AC2 | `src/lib/template-render.ts` (+ vitest) | vitest | proof-pending |
| T4 | Util pura anti-ban: `isWithinWindow`, `nextDelayMs`, `dailyCapRemaining`, reset diario por `sent_today_date` | AC4 | `src/lib/anti-ban.ts` (+ vitest) | vitest | ready |
| T5 | Rota `/disparos` (lista) substituindo placeholder + `CampaignList` + `StatusBadge` + botao Nova campanha | AC1 | `src/routes/_shell.disparos.tsx`, `src/components/disparos/campaign-list.tsx`, `src/components/disparos/status-badge.tsx` | preview manual | ready |
| T6 | `NewCampaignDialog` (wizard 4 passos): Select conexao/planilha, textarea template + preview live, form anti-ban (sliders/inputs), resumo | AC2 | `src/components/disparos/new-campaign-dialog.tsx`, `src/components/disparos/template-editor.tsx` | preview manual | ready |
| T7 | Rota `/disparos/$id`: cabecalho + controles Ativar/Pausar/Cancelar, contadores, tabela paginada de recipients, realtime via `useCampaignRealtime` | AC3, AC5, AC7 | `src/routes/_shell.disparos.$id.tsx`, `src/hooks/use-campaign-realtime.ts` | preview manual | ready |
| T8 | Worker `runDispatchTick` (server-only) + rota `/api/public/dispatch/tick` (POST, autentica via header `apikey` = anon key): seleciona campanhas `running`, para cada uma pega proximo `pending` com `FOR UPDATE SKIP LOCKED`, verifica janela+cap+status, chama `evolutionProvider.sendText`, atualiza recipient, dorme aleatorio bounded por tick | AC4, AC7 | `src/lib/dispatch-worker.server.ts`, `src/routes/api/public/dispatch.tick.ts` | vitest com provider mock + curl manual | ready |
| T9 | Migration: agendar pg_cron `dispatch_tick_every_min` (`* * * * *`) chamando `/api/public/dispatch/tick` via `pg_net` com header `apikey`, usando URL estavel `project--<id>-dev.lovable.app`; documentar troca para `.lovable.app` no release | AC4 | migration SQL (via `supabase--insert`, nao migration file, por conter URL/apikey) | `SELECT * FROM cron.job` + `cron.job_run_details` | ready |
| T10 | Prova P4: playwright cria campanha via wizard (mocks conexao/planilha), ativa, dispara tick com `sendText` mockado, verifica `campaign_recipients.status='sent'`; screenshots por passo em `/tmp/browser/f6/`; checklist de seguranca preenchido | AC1-AC8 | `ldk/features/f6-disparos/proof.md` | playwright + tsgo + checklist | ready |

## Checklist de seguranca / anti-ban
- [ ] Endpoint `/api/public/dispatch/tick` autentica via `apikey` (anon key); rejeita sem header.
- [ ] Nenhum log com telefone/rendered_text - apenas `recipient_id`, `campaign_id`, `status`.
- [ ] Opt-out respeitado em `createCampaign` E no worker (dupla checagem via `contacts.opt_out`).
- [ ] Janela horaria em `America/Sao_Paulo` (fixo v1, documentado).
- [ ] `min_ms` default >= 8000; UI avisa se `min<3000`.
- [ ] `daily_cap` default 200.
- [ ] Warm-up opcional: dia 1 = 20 msgs, +20/dia ate `daily_cap`.
- [ ] Kill-switch por campanha (status re-checado antes de cada envio).
- [ ] `service_role` usado apenas no worker server-only.

## Diagrama

```text
Planilha (F5) --+
Conexao (F2) ---+--> Wizard --> campaigns(draft) + campaign_recipients(pending)
Template --------+                          |
                                             v
                                Ativar -> status=running
                                             |
          pg_cron 1/min --> /api/public/dispatch/tick --> runDispatchTick()
                                             |
                                             v
                            para cada campanha running na janela:
                              - sent_today >= cap? skip
                              - pega proximo recipient pending (SKIP LOCKED)
                              - re-check status (kill-switch)
                              - re-check opt_out
                              - evolutionProvider.sendText()
                              - update recipient (sent|failed)
                              - sleep [min_ms,max_ms]
                                             |
                                             v
                       Realtime --> /disparos/$id (monitor + controles)
```

## Roadmap / dependencias
- Depende de F2 (done), F5 (done).
- Bloqueia F7 (metricas de disparo no dashboard).
- `[VERIFY]` pg_net habilitado no Lovable Cloud (checar em T9).

## Pre-flight otimista
`campaign_recipients` e `campaigns` ja existem, provider Evolution ja envia, realtime ja usado em F4, wizard ja tem padrao em F5. Anti-ban isolado em util pura testavel.

## Pre-flight pessimista
- pg_cron duplicando chamadas -> `FOR UPDATE SKIP LOCKED` + status re-check.
- Timezone errado -> fixo `America/Sao_Paulo` v1.
- Ban real -> T10 usa mock; teste com numero real fica manual pos-release.
- URL do endpoint muda entre preview/publicado -> usar URLs estaveis `project--<id>[-dev].lovable.app`.

## Status no ledger
F6: `idea` -> `approved` agora; muda para `building` no primeiro `ldk-build-task`.

## Etapa concluida
Plano aprovado e aguardando `/ldk-build-task` para T1.