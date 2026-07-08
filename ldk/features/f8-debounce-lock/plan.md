# F8 - Debounce + run lock - Plan

## Feature
F8 - Debounce por conversa + advisory lock no runtime do agente

## Risk
medio

## Proof required
P2

## Cerimonia
medio - plano completo, prova manual reproduzivel.

## Modo de execucao recomendado
`ldk-build`.

## Acceptance criteria
- AC1: Webhook agrupa mensagens da mesma `conversation_id` numa janela de
  `AGENT_DEBOUNCE_MS` (default 4000ms, cap 10000ms) e dispara
  `runAgentForMessage` uma unica vez com o `messageId` mais recente.
- AC2: `runAgentForMessage` tenta advisory lock via RPC
  `try_agent_lock(_conversation_id uuid)`; se lock falha, retorna
  `{status: 'skipped-locked'}` sem chamar LLM nem enviar mensagem.
- AC3: RPC criada em migration com `security definer`, `search_path=public`,
  usando `pg_try_advisory_xact_lock(hashtext(_conversation_id::text))`.
- AC4: Debounce nao atrasa mensagens de conversas diferentes (Map por
  conversation_id).
- AC5: Log estruturado sem PII quando lock e negado ou debounce dispara
  (formato `[agent-runtime] skipped-locked conversation=<id>`).
- AC6: Teste manual: 4 mensagens em <2s -> 1 unica sequencia de resposta.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration: RPC `try_agent_lock`/`release_agent_lock` com `pg_try_advisory_lock(hashtext(...))`. EXECUTE so service_role. | AC3 | supabase migration | linter ok | done |
| T2 | Integrar lock em `runAgentForMessage`: chamar RPC no inicio (apos guards baratos), retornar `skipped-locked` se false. Release no finally. | AC2, AC5 | `src/lib/agent-runtime.server.ts` | tsgo verde | done |
| T3 | Debounce no webhook: Map<conversationId, {timer, latestMessageId}> top-level; scheduler reseta timer a cada nova msg. | AC1, AC4 | `src/routes/api/public/evolution.webhook.ts` | tsgo verde | done |
| T4 | Prova manual P2: user envia 4 mensagens rapidas; verifica log e resposta unica. | AC6 | `ldk/features/f8-debounce-lock/proof.md` | manual do usuario | proof-pending |

## Arquivos criados/alterados (esperados)
- supabase migration (RPC try_agent_lock)
- src/lib/agent-runtime.server.ts (edit)
- src/routes/api/public/evolution.webhook.ts (edit)
- ldk/features/f8-debounce-lock/proof.md

## Fora de escopo
- Fila persistente multi-worker.
- Memoria de longo prazo.

## Roadmap/dependencias
- F3 done.

## Status no ledger
idea -> planned (aguarda aprovacao para `approved`).