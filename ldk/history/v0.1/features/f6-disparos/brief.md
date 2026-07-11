# F6 - Disparos

## Objetivo
Executar campanhas de WhatsApp a partir de planilhas importadas (F5), com template
de mensagem, anti-ban, worker autonomo por pg_cron e monitor em tempo real com
kill-switch.

## Usuario / caso de uso
Operador entra em `/disparos`, cria campanha em wizard (conexao+planilha ->
template com preview -> anti-ban -> revisao), ativa, e acompanha progresso.

## Escopo
- Lista + wizard + detalhe (monitor) em `/disparos`.
- Reutiliza tabela `campaign_recipients` (ja existente).
- Adiciona colunas de anti-ban em `campaigns`.
- Worker `pg_cron` -> `/api/public/dispatch/tick` (auth via `apikey`).
- Realtime em `campaign_recipients` para monitor.

## Fora de escopo
- Envio de midia.
- A/B de template.
- Retry exponencial (v1 = 1 retry simples).
- Multi-conexao por campanha.
- Segmentacao por tag/metadata (v1 = planilha inteira menos opt-out).

## Risco
alto (envio real, PII, risco de ban, worker autonomo).

## Proof required
P4.

## Dependencias
- F2 (Evolution sendText: done).
- F5 (spreadsheets/contacts: done).
- pg_cron + pg_net (Lovable Cloud): confirmar em T8.