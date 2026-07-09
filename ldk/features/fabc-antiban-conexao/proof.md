# Fabc - Anti-ban por conexao - Proof

## Status
Fabc => DONE (falta stress test real com 2 campanhas para P3)

## Arquivos alterados
- migration: dispatch_hourly_limit/daily_limit/sent_this_hour(+_at)/
  sent_today(+_date) em connections
- src/lib/dispatch-worker.server.ts

## AC cobertos
- AC1 Cota GLOBAL por connection_id: covered
- AC2 Excesso -> pending com next_send_at futuro, nao failed: covered
- AC3 Incrementa apenas apos envio ok: covered
- AC4 Preserva limites por campanha: covered

## Verificacao
- tsgo pass; migration aplicada; types regenerados.

## Limitacoes
- Increment ler+escrever, nao 100% atomico entre workers concorrentes.
- Sem UI para editar hourly/daily por conexao (defaults 60/200).

## LDK self-check
- Required proof identified: yes (P2)
- Critical errors: no
