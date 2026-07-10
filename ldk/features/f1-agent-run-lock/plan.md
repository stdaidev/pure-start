# Feature Plan - F1 Agent run ownership

Status: partial
Risk: alto
Proof required: P4
Discovery revision: 1
Optional tasks: none

## Brief

`ldk/features/f1-agent-run-lock/brief.md`

## Abordagem

Adicionar ownership transacional ao claim/release, propagar o token pelo runtime e centralizar a revalidacao antes de
cada efeito externo. Executar em modo `guided` por envolver migration, concorrencia e envio de mensagem.

## Tasks

| ID  | Descricao                                                                                          | AC            | Arquivos esperados                                                               | Verificacao                               | State         |
| --- | -------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------- | ----------------------------------------- | ------------- |
| T1  | Criar migration com `agent_run_token`/`agent_run_started_at` e RPCs de claim/release condicionais. | AC1, AC2      | `supabase/migrations/<timestamp>_agent_run_token.sql`                            | SQL/linter + claims/releases concorrentes | proof-pending |
| T2  | Atualizar tipos Supabase para colunas e assinaturas novas.                                         | AC1, AC2      | `src/integrations/supabase/types.ts`                                             | typecheck                                 | done          |
| T3  | Propagar `messageId`/`runToken` no tick e no runtime.                                              | AC2, AC3      | `src/routes/api/public/agent.tick.ts`, `src/lib/agent-runtime.server.ts`         | testes unitarios/integracao               | done          |
| T4  | Implementar revalidacao antes de cada efeito externo e status `skipped-*`.                         | AC3           | `src/lib/agent-runtime.server.ts`                                                | cenarios handoff/stale/inactive           | done          |
| T5  | Compartilhar normalizacao BR e verificar blocklist antes de LLM/envio.                             | AC4           | `src/lib/phone.ts`, `src/lib/agent-runtime.server.ts`, webhook quando necessario | teste de variantes                        | done          |
| T6  | Criar script/teste reproduzivel dos cenarios concorrentes com provider mockado.                    | AC3, AC4, AC5 | `tests/agent-run-lock.test.ts` ou equivalente                                    | comando com exit code 0                   | proof-pending |
| T7  | Executar build/lint/test/CI e consolidar proof P4 com diff e checklist.                            | AC6           | `ldk/features/f1-agent-run-lock/evidence.md`, `proof.md`                         | CI verde e referencias atuais             | proof-pending |

## Estrategia de prova

- P1: nao e suficiente isoladamente; smoke da inbox apenas como apoio.
- P2: cenarios manuais/mocados de handoff, stale e blocklist.
- P3: teste reproduzivel de concorrencia e revalidacao com exit code 0.
- P4: P3 + CI verde + commit/diff + revisao de grants, migrations, PII e efeitos externos.

## Evidencia durante execucao

- Acumular em `ldk/features/f1-agent-run-lock/evidence.md`.
- Nao usar envio real quando um provider mockado cobre o AC.

## Riscos e rollback

- Risco: lock preso, release indevido, duplicidade ou mensagem enviada apos handoff.
- Mitigacao: token condicional, `finally` seguro, testes concorrentes e rollout guiado.
- Rollback: migration aditiva; manter leitura do estado anterior ate a nova RPC estar validada.
