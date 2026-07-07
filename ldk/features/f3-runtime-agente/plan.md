# F3 - Runtime do agente + modulo Agentes - Plan

## Feature
F3 - Runtime do agente (webhook -> buffer -> LLM -> saida humanizada) + modulo Agentes

## Risk
alto

## Proof required
P4

## Cerimonia
alto - plano completo, checkpoint por task, prova reproduzivel.

## Modo de execucao recomendado
`ldk-build-task` (risco alto: segredo LLM, custo por chamada, PII em
historico, execucao em endpoint publico do webhook). Cada task e checkpoint.

## Acceptance criteria
- AC1: Contrato `LLMProvider` completo + `OpenAIProvider` implementa
  `complete({system, messages, tools, maxTokens})` server-only, sem chave
  no bundle client.
- AC2: Migration adiciona `agents.tools`, `agents.humanization`,
  `connections.default_agent_id`, tabela `conversation_markers` (para
  `/resetar`), com RLS+GRANT. Linter Supabase limpo.
- AC3: `/agentes` faz CRUD completo (listar, criar, editar, deletar,
  toggle active) com validacao Zod server-side.
- AC4: Ao criar uma `connection` com `default_agent_id`, novas
  `conversations` herdam `agent_id`.
- AC5: Webhook Evolution inbound (text) dispara runtime que persiste
  mensagem outbound em `messages` (`direction=outbound`, `status=sent`) e
  chama `EvolutionProvider.sendText`. Verificavel via mock curl.
- AC6: Runtime nao responde quando `conversations.assigned_to` != null
  (humano assumiu) ou `agents.active=false`.
- AC7: Tool `transferir_humano` chamada pelo LLM seta
  `conversations.assigned_to='human'` e para respostas futuras.
- AC8: Comando textual `/resetar` do usuario cria `conversation_markers`
  e runtime ignora historico anterior ao marker.
- AC9: Humanizacao: resposta longa e dividida em 2+ chunks com delay
  entre 800-3500ms (configuravel por agente). Cap total 12s.
- AC10: `OPENAI_API_KEY` nao aparece em `dist/client/`. `supabase--linter`
  limpo. Nenhum log com `content` de mensagem.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Coletar `OPENAI_API_KEY` via `add_secret`; confirmar modelo default `gpt-4o-mini` com usuario. | AC1 | (secrets store) | `fetch_secrets` lista `OPENAI_API_KEY`. | proof-pending |
| T2 | Migration: `agents.tools jsonb`, `agents.humanization jsonb`, `connections.default_agent_id uuid FK`, tabela `conversation_markers(id, workspace_id, conversation_id, kind, created_at)` com RLS+GRANT. | AC2 | migration via `supabase--migration` | Linter limpo; colunas visiveis em `information_schema.columns`. | proof-pending |
| T3 | Contrato `LLMProvider` + tipos (Message, ToolSpec, ToolCall, CompleteResult). Registry client-safe. | AC1 | `src/providers/llm/types.ts`, `src/providers/llm/registry.ts` | `tsgo` verde. | proof-pending |
| T4 | `OpenAIProvider` server-only (fetch chat completions, timeout 12s, max_tokens 800, sem log de content). | AC1, AC10 | `src/providers/llm/openai.server.ts` | `tsgo` verde; import protegido do bundle client. | proof-pending |
| T5 | Registry de tools server-only: `resetar`, `transferir_humano`. Handlers usam `supabaseAdmin`. | AC7, AC8 | `src/providers/tools/registry.server.ts` | Unit-testavel via chamada direta em curl mock. | proof-pending |
| T6 | Runtime `runAgentForMessage(messageId)` server-only: guard (assigned_to, active, outbound loop), monta historico com marker `/resetar`, chama LLM, executa tool_calls, humaniza (chunk+sleep), envia via EvolutionProvider, persiste outbound. | AC5, AC6, AC7, AC8, AC9 | `src/lib/agent-runtime.server.ts` | Curl no webhook com payload inbound mock gera linha outbound em `messages`. | proof-pending |
| T7 | Hook no webhook Evolution: filtra grupos via `connections.ignore_groups` (default true; migration incluida), apos persistir inbound text chama `runAgentForMessage` com try/catch e cap 12s; nunca falha o 200. Webhook ja e registrado no `createInstance` com `base64:true`. | AC5, AC6 | edit `src/routes/api/public/evolution.webhook.ts`; migration `connections.ignore_groups` | Curl: 2 posts identicos -> so 1 outbound; JID `@g.us` descartado. | proof-pending |
| T8 | Server functions `listAgents`, `getAgent`, `saveAgent`, `deleteAgent`, `toggleAgent`, `setConnectionAgent`, `setConnectionIgnoreGroups` com validacao Zod. | AC3, AC4 | `src/lib/agents.functions.ts` | `tsgo` verde; chamadas via `useServerFn` retornam dados esperados. | proof-pending |
| T9 | UI `/agentes`: lista HUD + dialog CRUD com form (name, description, model select, temperature slider, system_prompt textarea, tools multiselect, humanization min/max ms). Toggle active. | AC3 | `src/routes/_shell.agentes.tsx`, `src/components/agentes/*` | Playwright: cria/edita/deleta agente; screenshot. | proof-pending |
| T10 | UI `/conexoes`: adicionar select "Agente default" por conexao (usa `setConnectionAgent`). | AC4 | edit `src/routes/_shell.conexoes.tsx`, `src/components/conexoes/*` | Playwright: seleciona agente na conexao; persiste. | ready |
| T11 | Prova P4: Playwright fim-a-fim (CRUD agente + attach a conexao), curl no webhook com payload inbound simulado -> linha outbound gerada, `supabase--linter`, `grep` bundle sem `OPENAI_API_KEY`, escrever `proof.md`. | AC1-AC10 | `ldk/features/f3-runtime-agente/proof.md` | Todos os checks executados e registrados. | ready |

## Arquivos criados/alterados (esperados)
- migration Supabase (via tool)
- src/providers/llm/types.ts
- src/providers/llm/registry.ts
- src/providers/llm/openai.server.ts
- src/providers/tools/registry.server.ts
- src/lib/agent-runtime.server.ts
- src/lib/agents.functions.ts
- src/routes/api/public/evolution.webhook.ts (edit)
- src/routes/_shell.agentes.tsx (substituir placeholder)
- src/routes/_shell.conexoes.tsx (edit para select agente)
- src/components/agentes/*
- ldk/features/f3-runtime-agente/proof.md (no build)

## Fora de escopo
- TTS (ElevenLabs), transcricao Whisper.
- Streaming de tokens, RAG, multi-agente.
- Inbox humano (F4).
- Retry/DLQ sofisticado.

## Roadmap/dependencias
- F2 done (ok).
- [VERIFY] `OPENAI_API_KEY` (T1 bloqueado ate coleta).
- [VERIFY] Modelo default (`gpt-4o-mini` proposto).

## Status no ledger
idea -> planned (aguarda aprovacao do usuario para `approved`).