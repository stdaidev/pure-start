# F8 - Debounce + run lock - Plan

## Feature
F8 - Debounce persistente por conversa + run lock no runtime do agente

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
  `AGENT_DEBOUNCE_MS` (default 4000ms, cap 10000ms) ou `agents.debounce_seconds`
  e agenda uma unica execucao persistente com o `messageId` mais recente.
- AC2: O tick do agente reivindica conversas vencidas com lock persistente por
  linha (`agent_running_since`) e nao executa duas vezes a mesma conversa.
- AC3: RPCs persistentes criadas em migration com `security definer`,
  `search_path=public` e EXECUTE somente para `service_role`.
- AC4: Debounce nao atrasa mensagens de conversas diferentes (estado por linha
  de `conversations`).
- AC5: Log estruturado sem PII quando agenda, processa ou falha
  (ex.: `[webhook/evolution] queued-agent-run conversation=<id>`).
- AC6: Teste manual: 4 mensagens em <2s -> 1 unica sequencia de resposta.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration: adicionar `agent_run_at`, `agent_running_since`, `agent_latest_message_id` em `conversations` e RPCs `schedule_agent_run`, `claim_due_agent_runs`, `release_agent_run`. EXECUTE so service_role. | AC2, AC3, AC4 | supabase migration | migration aplicada + linter sem issues novas | proof-pending |
| T2 | Remover lock advisory do runtime e manter guards em `runAgentForMessage`; a trava passa a ser o claim persistente antes da chamada. | AC2 | `src/lib/agent-runtime.server.ts` | tsgo verde | proof-pending |
| T3 | Debounce no webhook: substituir Map/setTimeout por `schedule_agent_run`; ultimo message-id vence no banco. | AC1, AC4, AC5 | `src/routes/api/public/evolution.webhook.ts` | tsgo verde | proof-pending |
| T4 | Criar tick `/api/public/agent/tick` autenticado por `apikey`, reivindica jobs vencidos e libera `agent_running_since` no `finally`. | AC2, AC5 | `src/routes/api/public/agent.tick.ts` | tsgo verde | proof-pending |
| T5 | Prova manual P2: user envia 4 mensagens rapidas; tick processa e resposta unica. | AC6 | `ldk/features/f8-debounce-lock/proof.md` | manual do usuario | proof-pending |

## Arquivos criados/alterados (esperados)
- supabase migration (colunas de fila/trava + RPCs persistentes)
- src/lib/agent-runtime.server.ts (edit)
- src/routes/api/public/evolution.webhook.ts (edit)
- src/routes/api/public/agent.tick.ts (new)
- ldk/features/f8-debounce-lock/proof.md

## Fora de escopo
- Tabela dedicada de fila; a fila usa `conversations`.
- Memoria de longo prazo.

## Roadmap/dependencias
- F3 done.

## Status no ledger
idea -> planned (aguarda aprovacao para `approved`).