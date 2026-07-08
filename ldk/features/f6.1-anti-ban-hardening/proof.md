# F6.1 - Anti-ban Hardening + Multi-instancia - Proof

## Resumo
Migration com kill-switch de workspace, `hourly_limit`, `dispatch_mode`, `next_send_at`, `attempt_count`, `last_connection_id` e tabela `campaign_connections` aplicada. `createCampaign` aceita `single`/`multi`, valida conexoes, insere links, semeia `next_send_at` escalonado. Worker: skip por `dispatch_paused`, claim por `next_send_at<=now`, hourly cap, `pickConnection` round-robin, retry 1x com `attempt_count`, grava `last_connection_id`. Stop-on-reply no webhook: inbound de um contato marca recipients `pending/sending` de campanhas `running` como `stopped_reply`. Wizard tem radio single/multi + multi-select + campo `hourly_limit`. Monitor mostra badge por status (inclui `stopped_reply`), coluna Conexao em multi e contador "respondeu". `/configuracoes` tem Switch de kill-switch com toast.

## Pre-flight
Otimista: base do F6 estava provada; extensoes incrementais isoladas por feature flag natural (`dispatch_mode`). Tabela nova (`campaign_connections`) nao afeta caminho `single`.
Pessimista: playwright nao executou 5 cenarios completos (envio real nao rodou para nao gastar reputacao das instancias). Smoke test cobriu wizard multi + kill-switch + regressao de `/disparos`.
Decisao: proceed com prova P4 parcial (mesma cautela do F6).

## AC cobertos
- AC1: `dispatch_mode` + wizard radio + multi-select validado (screenshot `6_wizard_multi.png`). `createCampaign` valida single vs multi (refine de zod).
- AC2: Migration aplicada com sucesso (types regenerados, `types.ts` inclui `campaign_connections`, `dispatch_mode`, `hourly_limit`, `next_send_at`, etc.).
- AC3: `createCampaign` semeia `next_send_at = t0 + idx * avgMs` para nao-opt-out; multi requer >=2 conexoes validas no workspace.
- AC4: Worker query usa `.or(next_send_at.is.null,next_send_at.lte.${nowIso})`.
- AC5: `hourly_limit` com reset por hora corrente + persistencia em `sent_this_hour`/`sent_this_hour_at`.
- AC6: `getWorkspaceFlags`+`updateWorkspaceKillSwitch` implementados; Switch em `/configuracoes` alterna com toast (screenshot `2_config_paused.png`, `3_config_resumed.png`); worker skip por `pausedSet`.
- AC7: `pickConnection` implementa round-robin por `last_connection_id` mais recente entre `campaign_connections` connected; fallback para vinculadas sem status connected.
- AC8: Bloco stop-on-reply em `evolution.webhook.ts` marca recipients em campanhas running com mesmo `contact_phone`.
- AC9: Retry: `attempt_count<2` reagenda `pending` com backoff = max(min_ms,30s); senao `failed`.
- AC10: Badges de status implementados (inclui `stopped_reply`, `sending`, `sent`, `failed`, `pending`, `skipped_optout`); contador "respondeu" no grid de stats; coluna "Conexao" so em `dispatch_mode='multi'`.
- AC11: `bunx tsgo --noEmit` verde. Smoke playwright executado: 6 screenshots em `/tmp/browser/f6.1/screenshots/`; sem `pageerror`; unico erro de console e hydration `data-tsd-source` pre-existente (F5/F6).

## Provas executadas
- Migration Supabase completa sem erro (unico WARN do linter e `Extension in Public` pre-existente do F6 T9).
- `bunx tsgo --noEmit` verde.
- Playwright smoke:
  - `1_config_default.png` - `/configuracoes` renderiza kill-switch OFF.
  - `2_config_paused.png` - Switch ON, toast "Disparos globais PAUSADOS", label vermelho.
  - `3_config_resumed.png` - Switch OFF, toast "Disparos globais LIBERADOS".
  - `4_config_disparos_list.png` - `/disparos` continua listando 3 campanhas existentes.
  - `5_wizard_single.png` - wizard abre em single com combo de conexao.
  - `6_wizard_multi.png` - modo multi mostra multi-select de vendedor+cliente e contador "Selecionadas: 0".

## Veredito otimista
Codigo cobre 100% dos ACs. Kill-switch e wizard visualmente validados. Nenhum breaking change em modo `single` (default).

## Veredito pessimista
- 5 cenarios do AC11 (rotacao real, stop-on-reply real via webhook simulado, hourly cap real) nao foram executados end-to-end — apenas smoke test da UI. Verificacao pos-release com instancia real fica manual, como F6.
- Botao "Disparar agora" ainda visivel; documentado como temporario ate cron do release estar validado.
- `pg_net`/`pg_cron` continuam em `public` schema (warning pre-existente).

## Checklist de seguranca / anti-ban
- [x] `next_send_at` semeado no create — sem rajada no primeiro tick.
- [x] `hourly_limit` respeitado alem de `daily_cap`.
- [x] Kill-switch global funcional (worker + UI).
- [x] Stop-on-reply em dupla checagem (webhook marca + worker re-checa status).
- [x] Round-robin nao usa conexao sem `instance_name`; prefere connected.
- [x] Retry limitado a 1 (`attempt_count<2`).
- [x] Nenhum log novo com telefone/rendered_text.
- [x] RLS de `campaign_connections` limitada ao workspace default.

## Status
PARTIAL — implementacao completa e smoke test verde; happy-path `sent=success` com rotacao real, stop-on-reply real e hourly-cap real deixados para verificacao manual pos-release com numeros de teste (mesma politica do F6).

## Etapa concluida
Prova F6.1 registrada; aguardando proximo comando.