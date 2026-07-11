# F6.1 - Anti-ban Hardening + Multi-instancia

## Objetivo
Fechar as lacunas de anti-ban do F6 (rajada no primeiro tick, sem teto por
hora, sem stop-on-reply, sem kill-switch global) e permitir campanha usar 1
conexao (modo simples) ou N conexoes com rotacao round-robin (modo
multi-instancia), sempre respeitando limites por conexao.

## Usuario / caso de uso
Operador cria campanha e escolhe:
- **Modo `single`**: 1 conexao, comportamento atual (F6).
- **Modo `multi`**: seleciona 2+ conexoes; worker rotaciona entre elas por
  destinatario, respeitando `daily_cap` e `hourly_limit` por conexao.
Se um lead responder durante a campanha, os envios pendentes para aquele
contato sao interrompidos. Operador tambem tem um kill-switch de workspace
que pausa TODOS os disparos imediatamente.

## Escopo
- Migration: campos anti-ban novos (`hourly_limit`, `sent_this_hour*`,
  `next_send_at`, `attempt_count`, `dispatch_paused` no workspace,
  `dispatch_mode` na campanha, tabela `campaign_connections` para modo multi).
- `createCampaign`: valida modo, aceita array de `connection_ids`, semeia
  `next_send_at` escalonado.
- Worker: claim por `next_send_at <= now()`, checa hourly cap + kill-switch,
  rotaciona conexao em modo multi, faz 1 retry em falha.
- Inbound (evolution webhook): stop-on-reply — ao receber mensagem inbound
  de um contato com recipient `pending`/`sending` em campanha `running`,
  marca como `stopped_reply`.
- UI: novo passo/seletor no wizard (single vs multi + escolha de conexoes),
  novo status `stopped_reply` no monitor, botao kill-switch em
  `/configuracoes`.

## Fora de escopo
- Multi-step / cadencia de mensagens (feature separada futura).
- Warm-up por conexao (fica linear por campanha como hoje).
- Balanceamento por saude/qualidade de conexao (v2).

## Risco
alto (envio real, RLS/migrations, worker autonomo, mudanca em fluxo com
destinatarios reais).

## Proof required
P4.

## Dependencias
- F6 done partial (base do worker/wizard/monitor).
- F2 done (multiplas conexoes ja existem em `connections`).
- F4 done (webhook inbound onde stop-on-reply vai enganchar).