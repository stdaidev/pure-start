# F6.1 - Anti-ban Hardening + Multi-instancia - Plan

Feature: F6.1 - Anti-ban hardening + multi-instancia
Risk: alto
Proof required: P4
Cerimonia: alto completa
Modo de execucao recomendado: `ldk-build-task` (checkpoint manual por task)

## Acceptance criteria
- AC1: Campanha tem `dispatch_mode` (`single` | `multi`). Wizard obriga escolher; `single` mantem 1 `connection_id`; `multi` grava N linhas em `campaign_connections` e ignora `campaigns.connection_id`.
- AC2: Migration adiciona (a) `campaigns.hourly_limit int default 60`, `sent_this_hour int default 0`, `sent_this_hour_at timestamptz`, `dispatch_mode text default 'single' check in (single,multi)`; (b) `campaign_recipients.next_send_at timestamptz`, `attempt_count int default 0`, `last_connection_id uuid`; (c) `workspaces.dispatch_paused boolean default false`; (d) tabela `campaign_connections(campaign_id, connection_id, position int)` com GRANT + RLS.
- AC3: `createCampaign` semeia `next_send_at` escalonado a partir de `now()` usando media de `min_ms/max_ms` * indice, para nao concentrar rajada. Modo `multi` exige >=2 conexoes conectadas; modo `single` mantem comportamento atual.
- AC4: Worker so faz claim de recipient com `status='pending' AND (next_send_at IS NULL OR next_send_at <= now())`. Rajada primaria eliminada (verificado por teste unit).
- AC5: Worker respeita `hourly_limit` por campanha (reset por `sent_this_hour_at` hora corrente SP) alem do `daily_cap`.
- AC6: Kill-switch global: se `workspaces.dispatch_paused=true`, worker pula todas as campanhas do workspace no tick. Botao em `/configuracoes` alterna via server fn.
- AC7: Modo `multi`: worker escolhe proxima conexao em round-robin baseado em `campaign_connections.position` e uso recente (`last_connection_id` do ultimo recipient enviado), pulando conexoes desconectadas ou que atingiram `hourly_limit`/`daily_cap` proprios (contagem via `campaign_recipients.last_connection_id`).
- AC8: Stop-on-reply: `evolution-webhook.server.ts` marca `campaign_recipients.status='stopped_reply'` para todos os recipients `pending`/`sending` do mesmo `contact_phone` em campanhas `running` do workspace ao receber mensagem inbound.
- AC9: Retry simples: em `catch` do envio, se `attempt_count < 1`, worker reagenda `next_send_at = now()+backoff` e mantem `pending`; senao marca `failed`.
- AC10: Monitor `/disparos/$id` mostra novo status `stopped_reply` e, em modo `multi`, coluna/badge com conexao usada por recipient.
- AC11: `bunx tsgo --noEmit` verde. Playwright cobre: (i) criar campanha `multi` com 2 conexoes seed, (ii) rodar tick com provider mockado, (iii) verificar rotacao (`last_connection_id` alternado), (iv) simular inbound e verificar `stopped_reply`, (v) togglar kill-switch e ver worker pular.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration: novos campos em `campaigns`, `campaign_recipients`, `workspaces`; tabela `campaign_connections` com GRANT + RLS; backfill `next_send_at=created_at` para pending existentes | AC2 | `supabase/migrations/*.sql` | supabase linter | done |
| T2 | Update `campaigns.functions.ts` `createCampaign`: aceita `dispatch_mode`, `connection_ids[]`, valida, insere `campaign_connections`, semeia `next_send_at` escalonado; novo `getCampaignConnections`; `updateWorkspaceKillSwitch` | AC1, AC3, AC6 | `src/lib/campaigns.functions.ts`, `src/lib/workspace.functions.ts` | tsgo + chamada manual | done |
| T3 | Refatorar `dispatch-worker.server.ts`: (a) skip se `workspaces.dispatch_paused`; (b) claim por `next_send_at`; (c) `hourly_limit` com reset hora SP; (d) resolver conexao via helper `pickConnection(campaign)` que faz single OU round-robin em `multi`; (e) retry 1x com `attempt_count`; (f) gravar `last_connection_id` no recipient | AC4, AC5, AC6, AC7, AC9 | `src/lib/dispatch-worker.server.ts`, `src/lib/dispatch-connection.server.ts` | vitest | done |
| T4 | Stop-on-reply em `evolution.webhook.ts`: apos gravar message inbound, UPDATE `campaign_recipients` matching `contact_phone` + workspace + status in (pending,sending) + campaign.status=running -> `stopped_reply` | AC8 | `src/routes/api/public/evolution.webhook.ts` | teste manual + curl webhook | done |
| T5 | Wizard: novo controle `dispatch_mode` (radio single/multi); em `multi`, multi-select de conexoes (min 2); resumo mostra conexoes escolhidas; campo `hourly_limit` | AC1 | `src/components/disparos/new-campaign-dialog.tsx` | preview manual | done |
| T6 | Monitor: badge novo `stopped_reply` (cinza), coluna "Conexao" quando `dispatch_mode='multi'`, contador de stopped_reply | AC10 | `src/routes/_shell.disparos.$id.tsx`, `src/components/disparos/status-badge.tsx` | preview manual | done |
| T7 | Kill-switch UI em `/configuracoes`: Switch grande "Pausar todos os disparos" com toast | AC6 | `src/routes/_shell.configuracoes.tsx`, `src/lib/workspace.functions.ts` | preview manual | done |
| T8 | Prova P4: playwright cobre 5 cenarios do AC11; screenshots em `/tmp/browser/f6.1/`; checklist anti-ban preenchido | AC1-AC11 | `ldk/features/f6.1-anti-ban-hardening/proof.md` | playwright + tsgo | done |

## Checklist de seguranca / anti-ban
- [ ] `next_send_at` semeado no create (nao ha rajada no primeiro tick).
- [ ] `hourly_limit` respeitado alem de `daily_cap`.
- [ ] Kill-switch global funcional e testado.
- [ ] Stop-on-reply respeitado em dupla checagem (webhook + worker re-check).
- [ ] Round-robin nao vaza para conexao desconectada / acima do cap.
- [ ] Retry limitado a 1 (nao explode em loop).
- [ ] Nenhum log novo com telefone/rendered_text.
- [ ] RLS de `campaign_connections` restrita ao workspace.

## Diagrama

```text
Wizard --mode=single|multi + connection_ids[]--> createCampaign
                                                     |
                                                     v
                                campaigns + campaign_connections + recipients(next_send_at escalonado)
                                                     |
  pg_cron 1/min --> tick --> if workspace.dispatch_paused: skip
                              claim recipients WHERE next_send_at<=now()
                              pickConnection(single|multi round-robin)
                              enviar; on fail e attempt<1 -> reagenda
                              atualiza last_connection_id
                                                     |
  inbound webhook --> stop-on-reply (recipients pending/sending do mesmo phone -> stopped_reply)
```

## Roadmap / dependencias
- Depende de F6 (partial done) e F4 (webhook).
- Nao bloqueia F7; podem seguir em paralelo.
- Fecha o gap identificado na comparacao com ia-agent-page (rajada, hourly, stop-on-reply, multi-instancia).

## Pre-flight otimista
Base do F6 esta provada; mudancas sao incrementais em worker + wizard. Tabela nova (`campaign_connections`) e isolada. Stop-on-reply usa webhook ja existente.

**Estado atual do codigo (emendas pos-F6, ver `f6-disparos/proof.md`):**
- `dispatch-worker.server.ts` ja tem `normalizeMsisdn` — preservar em T3.
- `evolution.server.ts` ja anexa `snippet` de erro upstream — preservar.
- `_shell.disparos.$id.tsx` tem botao "Disparar agora" TEMPORARIO para chamar `/api/public/dispatch/tick`. Manter durante F6.1 (util para testar cenarios do AC11); esconder atras de flag dev-only ou remover quando o `pg_cron` do release estiver validado (T8 / release).
- `deleteCampaign` + botao lixeira em `campaign-list.tsx` — preservar, nao entra em regressao de F6.1.

## Pre-flight pessimista
- Round-robin com contagem por conexao pode ficar caro em queries; mitigar com index em `campaign_recipients(campaign_id, last_connection_id, sent_at)`.
- Semear `next_send_at` para planilhas grandes (>10k) pode gerar transacao pesada; mitigar com batch/limit no create (ja tem limite de linhas).
- Modo `multi` precisa UI clara para operador nao selecionar conexao errada; wizard bloqueia se <2 conectadas.
- Kill-switch global em workspace default v1 (sem multi-workspace real ainda) — documentar.

## Status no ledger
F6.1: nova entrada `planned` -> `approved` apos confirmacao do usuario.

## Etapa concluida
Plano F6.1 pronto e aguardando proximo comando.