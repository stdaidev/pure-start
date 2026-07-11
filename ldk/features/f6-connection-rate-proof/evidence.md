# F6 Evidence - 2026-07-10

Status: BUILDING

## Implementacao

- `try_reserve_campaign_slot` serializa por campanha com `FOR UPDATE` e reserva simultaneamente as cotas horaria,
  diaria e de warm-up.
- `release_campaign_slot` compensa somente a hora/dia da reserva, sem reduzir contadores de uma janela posterior.
- Worker reserva campanha antes da conexao e compensa ambas em falha do provider, opt-out, cooldown, kill-switch,
  stop-on-reply, conexao indisponivel e texto vazio.
- RPCs sao `SECURITY DEFINER`, revogadas de `PUBLIC`, `anon` e `authenticated`, e concedidas somente a `service_role`.

## Evidencia local

- Typecheck e lint sem erros.
- 19 testes unitarios passam em Node 22.
- Checker LDK passa.

## Prova pendente

Aplicar a migration e executar chamadas concorrentes contra o Supabase real sem acionar o provider. Somente depois
dos asserts de teto e compensacao, build e CI a feature pode receber P4/DONE.

## Evidencia remota - 2026-07-11

- Migrations aplicadas no Lovable Cloud; RPCs e grants verificados.
- Com `hourly_limit=2`, duas reservas passaram e a terceira retornou `hour_full=true`, mantendo contador em 2.
- Release decrementou hora/dia; nova reserva passou; `daily_cap=3` bloqueou a seguinte com `day_full=true`.
- Fixtures `__smoke__` foram removidas e nenhum provider foi chamado.
- O lock `FOR UPDATE` foi inspecionado, mas o harness de duas sessoes concorrentes exigido para P4 ainda nao foi
  versionado; a feature permanece BUILDING.
