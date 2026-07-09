# Fagx-3 - Observabilidade estruturada do agente (agent_run_logs)

## Objetivo
Rastro estruturado por execucao do agente para diferenciar `ok` de
`skipped-*`/`failed-*`, sem PII, sem content, sem args sensiveis de tool.

## Escopo v1
- Tabela `agent_run_logs` (workspace_id, conversation_id, message_id,
  agent_id, status, reason, model, tool_rounds, tool_calls jsonb com
  `[{name,status}]`, prompt/completion/total_tokens, started_at,
  finished_at, duration_ms, error_code, created_at).
- Grants: service_role all; authenticated SELECT por workspace via RLS.
- Indices `(workspace_id, created_at desc)` e `(conversation_id)`.
- Runtime insere 1 log por execucao (ok/skip/failed).

## Fora de escopo
- Dashboard visual dos logs.
- Retencao/rotacao.
- F13 memoria/resumo.

## Prova minima
P2: 2 runs manuais + `SELECT * FROM agent_run_logs` mostrando status,
tokens, tool_calls sanitizado.

## Dependencias
- Fagx-1 done (status novos).
- Fagx-2 done (error_code padronizado).