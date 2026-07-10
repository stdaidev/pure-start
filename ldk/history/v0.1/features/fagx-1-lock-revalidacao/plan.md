# Fagx-1 - Plan

## Feature
Fagx-1 - Lock com run_token + revalidacao pre-envio + blocklist no runtime

## Risk
alto

## Proof required
P3

## Modo de execucao recomendado
`ldk-build-task` (risco alto: RPC de lock, chamada de LLM, envio real).

## Acceptance criteria
- AC1: `conversations` tem `agent_run_token uuid null` e
  `agent_run_started_at timestamptz null`. Linter Supabase limpo.
- AC2: `claim_due_agent_runs` retorna `run_token` unico por claim e grava
  o mesmo valor em `conversations.agent_run_token`.
- AC3: `release_agent_run(_conversation_id, _run_token)` so limpa
  `agent_running_since`/`agent_run_token` quando o token bate; token
  divergente => noop e o lock do run vigente segue intacto.
- AC4: `runAgentForMessage` recebe `runToken` e propaga para
  `shouldAbortBeforeSend`.
- AC5: Antes de cada chunk (`sendTyping`+`sendText`), runtime recarrega
  conversa+agente. Se `assigned_to != null` => abort `skipped-human`.
- AC6: Se `agents.active = false` no reload => abort `skipped-inactive`.
- AC7: Se `agent_latest_message_id != messageId` OU
  `agent_run_token != runToken` OU `connection_id`/`contact_id` mudou =>
  abort `skipped-stale`. Nenhum chunk enviado.
- AC8: Apos carregar contato e antes do LLM, runtime consulta
  `agent_ignored_numbers` com variantes BR (com/sem `55`, com/sem 9);
  match => `skipped-blocklisted`, sem LLM, sem envio.
- AC9: `agent.tick.ts` passa `run_token` para `runAgentForMessage` e para
  `release_agent_run`; runtime antigo com token velho nao consegue
  liberar lock de run novo.
- AC10: Script de teste cobre os 4 cenarios (concorrencia, handoff,
  stale, blocklist) com mock do EvolutionProvider e assert de envios == 0
  ou 1 conforme cenario.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration: colunas `agent_run_token`/`agent_run_started_at` em `conversations`. | AC1 | migration Supabase | Linter Supabase limpo; `information_schema.columns`. | ready |
| T2 | Migration: reescrever `claim_due_agent_runs` (retorna `run_token`, grava token) e `release_agent_run(_conversation_id, _run_token)` (condicional). Revoke public, grant service_role. | AC2, AC3 | migration Supabase | `SELECT` direto no psql: token unico por claim; release com token errado nao altera linha. | ready |
| T3 | `agent-runtime.server.ts`: assinatura `runAgentForMessage(messageId, runToken)`; helper `shouldAbortBeforeSend`; novos status em `RunAgentResult`. | AC4, AC5, AC6, AC7 | `src/lib/agent-runtime.server.ts` | `tsgo` verde; leitura do diff. | ready |
| T4 | Blocklist BR (helper compartilhado com webhook se possivel) chamada no runtime apos load do contato. | AC8 | `src/lib/agent-runtime.server.ts` + eventual `src/lib/phone.ts` | `tsgo` verde; script T7 cobre. | ready |
| T5 | `agent.tick.ts`: propaga `run_token` do claim para `runAgentForMessage(...)` e `release_agent_run(_conversation_id, _run_token)`. | AC9 | `src/routes/api/public/agent.tick.ts` | `tsgo` verde. | ready |
| T6 | Ajustar tipos gerados/`types.ts` se necessario para novas colunas/RPCs. | AC1, AC2 | `src/integrations/supabase/types.ts` | `tsgo` verde. | ready |
| T7 | Script de proof `scripts/agent-lock-proof.ts`: mocka EvolutionProvider, executa os 4 cenarios contra runtime real usando supabaseAdmin em workspace de teste. | AC10 | `scripts/agent-lock-proof.ts`, `ldk/features/fagx-1-lock-revalidacao/proof.md` | `bun run scripts/agent-lock-proof.ts` => todos asserts ok. | ready |

## Arquivos criados/alterados (esperados)
- 2 migrations Supabase
- `src/lib/agent-runtime.server.ts`
- `src/routes/api/public/agent.tick.ts`
- `src/lib/phone.ts` (opcional, extracao do helper de variantes BR)
- `src/integrations/supabase/types.ts` (regenerado)
- `scripts/agent-lock-proof.ts`
- `ldk/features/fagx-1-lock-revalidacao/proof.md`

## Fora de escopo
- Retry/backoff OpenAI, tools resilientes, model default (Fagx-2).
- Tabela de logs / observabilidade (Fagx-3).

## Roadmap/dependencias
- Fhot done (agent.tick sem race).
- F9 done (blocklist).
- Bloqueia Fagx-2 e Fagx-3 (ambos assumem `runToken`).

## Status no ledger
idea -> planned (aguarda aprovacao).