# Feature Plan - F6 Connection rate proof

Status: planned
Risk: alto
Proof required: P4
Discovery revision: 1
Optional tasks: none

## Brief

`ldk/features/f6-connection-rate-proof/brief.md`

## Abordagem

Tratar a implementacao atual como hipotese: auditar SQL/grants, criar harness concorrente sem envio real e somente
promover a evidencia quando caps e rollback forem observados sob disputa.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Auditar RPCs, invariantes e grants da reserva/liberacao. | AC1-AC4 | migrations atuais, possivel migration corretiva | catalog/SQL review | ready |
| T2 | Criar fixture/harness com duas campanhas concorrentes e provider sem efeito real. | AC1, AC2 | `tests/connection-rate.test.ts` ou equivalente | stress test reproduzivel | ready |
| T3 | Cobrir falha apos reserva e contrato de compensacao/release. | AC3 | worker/testes | asserts de contador/estado | ready |
| T4 | Rodar build/lint/test/CI e consolidar proof P4. | AC4, AC5 | `evidence.md`, `proof.md` | CI, diff e checklist | ready |

## Estrategia de prova

- P1: nao suficiente.
- P2: inspecao manual de estados antes/depois.
- P3: stress test reproduzivel com asserts.
- P4: P3 + CI verde + diff/commit + revisao de grants e ausencia de envio real.

## Evidencia durante execucao

- Acumular em `ldk/features/f6-connection-rate-proof/evidence.md`.

## Riscos e rollback

- Risco: ultrapassar cap ou deixar contador reservado apos falha.
- Mitigacao: ambiente sem envio, transacao atomica e asserts antes do rollout.
- Rollback: nao alterar limites/producao ate o harness passar; migration corretiva deve ser reversivel.
