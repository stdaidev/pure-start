# Feature Plan - F3 Agent observability

Status: planned
Risk: medio
Proof required: P2
Discovery revision: 1
Optional tasks: none

## Brief

`ldk/features/f3-agent-observability/brief.md`

## Abordagem

Criar schema minimo e sanitizacao por allowlist; emitir um evento ao encerrar cada run e provar com consultas
controladas sem dados pessoais.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Criar tabela, grants, RLS e indices de `agent_run_logs`. | AC1 | migration Supabase | linter + catalog queries | backlog |
| T2 | Tipar payload e registrar sucesso/skip/falha por run. | AC2, AC3 | `src/lib/agent-runtime.server.ts`, `src/integrations/supabase/types.ts` | dois runs controlados | backlog |
| T3 | Aplicar allowlist e sanitizacao de tools/erros. | AC4, AC5 | `src/lib/agent-runtime.server.ts` | query + grep de campos proibidos | backlog |
| T4 | Consolidar proof P2 com amostras sanitizadas. | AC1-AC6 | `ldk/features/f3-agent-observability/proof.md` | query observavel | backlog |

## Estrategia de prova

- P1: nao suficiente isoladamente.
- P2: executar dois runs controlados e inspecionar registros/ausencia de PII.
- P3: opcional se houver teste automatizado de sanitizacao.
- P4: nao exigido nesta feature; release publico reavalia auth/retencao.

## Evidencia durante execucao

- Acumular queries sanitizadas em `evidence.md` se necessario.

## Riscos e rollback

- Risco: persistir PII ou gerar volume ilimitado.
- Mitigacao: allowlist, sem payload bruto e gate de retencao.
- Rollback: interromper emissao e manter migration reversivel sem apagar evidencia necessaria.
