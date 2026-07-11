# Fagx-3 - Plan

## Feature
Fagx-3 - Observabilidade estruturada do agente

## Risk
medio

## Proof required
P2

## Modo de execucao recomendado
`ldk-build`.

## Acceptance criteria
- AC1: `public.agent_run_logs` criada com todos os campos, GRANT, RLS
  ativo e policy de SELECT por workspace.
- AC2: Indices `(workspace_id, created_at desc)` e `(conversation_id)`
  presentes.
- AC3: Runtime insere 1 log por execucao (sucesso/skip/failed) com
  `status`, `started_at`, `finished_at`, `duration_ms`.
- AC4: `tool_calls` = `[{name, status}]`; nunca `arguments` nem resultado
  literal.
- AC5: `prompt_tokens`/`completion_tokens`/`total_tokens` preenchidos
  quando OpenAI retorna `usage`.
- AC6: `error_code` usa o code definido em Fagx-2.
- AC7: Nenhum campo contem telefone, content de mensagem, prompt, args
  de tool ou resposta gerada.
- AC8: `tsgo` verde; linter Supabase limpo.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration: criar `agent_run_logs` + GRANT + RLS + indices. | AC1, AC2 | migration Supabase | Linter; `\\d+ agent_run_logs`. | ready |
| T2 | Runtime: payload de log ao final de cada `runAgentForMessage`, incluindo skips e falhas. | AC3, AC5, AC6 | `src/lib/agent-runtime.server.ts` | Manual + `SELECT ... FROM agent_run_logs`. | ready |
| T3 | Sanitizacao: `tool_calls` so `{name,status}`; grep de sensivel. | AC4, AC7 | `src/lib/agent-runtime.server.ts` | `rg 'agent_run_logs' src/`. | ready |
| T4 | Regenerar `types.ts` e tipar insert. | AC1, AC8 | `src/integrations/supabase/types.ts` | `tsgo`. | ready |
| T5 | Proof com 2 runs + resultado da query. | AC1-AC8 | `ldk/features/fagx-3-observabilidade/proof.md` | Manual. | ready |

## Arquivos criados/alterados (esperados)
- migration `agent_run_logs`
- `src/lib/agent-runtime.server.ts`
- `src/integrations/supabase/types.ts`
- `ldk/features/fagx-3-observabilidade/proof.md`

## Fora de escopo
- Dashboard visual.
- Retencao/rotacao.
- F13 memoria/resumo.

## Roadmap/dependencias
- Depende de Fagx-1 e Fagx-2 done.

## Status no ledger
idea -> planned.