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
