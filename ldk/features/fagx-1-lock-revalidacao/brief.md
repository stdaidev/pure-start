# Fagx-1 - Lock com run_token + revalidacao pre-envio + blocklist no runtime

## Objetivo
Eliminar respostas duplicadas, respostas velhas e respostas para numero
bloqueado tardiamente. Fechar a janela do lock atual do agente
(`agent_running_since` reciclado apos 30s) e revalidar estado antes de
cada envio.

## Usuario
Operador da inbox. Ganha garantia de que o agente nao envia depois de
"Assumir", nao responde mensagem velha e nao viola blocklist adicionada
depois do schedule.

## Escopo v1
- Migration em `conversations`:
  - `agent_run_token uuid null`
  - `agent_run_started_at timestamptz null`
- RPC `claim_due_agent_runs`: gera `run_token` (`gen_random_uuid()`),
  grava em `agent_run_token`/`agent_run_started_at`, retorna
  `(conversation_id, message_id, run_token)`.
- RPC `release_agent_run(_conversation_id uuid, _run_token uuid)`: so
  libera se `agent_run_token = _run_token`. Sem match => noop.
- `agent-runtime.server.ts`:
  - Assinatura passa a receber `messageId` + `runToken`.
  - Nova funcao `shouldAbortBeforeSend({ conversationId, messageId, runToken })`
    recarrega `conversations` (`assigned_to`, `agent_id`,
    `agent_latest_message_id`, `connection_id`, `contact_id`,
    `agent_run_token`) e `agents.active`.
  - Chamada antes de cada `sendTyping`/`sendText` (por chunk).
  - Blocklist BR (com/sem `55`, com/sem nono digito) checada apos
    carregar contato, antes do LLM.
  - Novos status em `RunAgentResult`: `skipped-human`, `skipped-inactive`,
    `skipped-stale`, `skipped-blocklisted`.
- `agent.tick.ts` propaga `run_token` para runtime e para o release.

## Fora de escopo
- Tabela `agent_runs`/logs estruturados (Fagx-3).
- Retry/backoff OpenAI + tools resilientes (Fagx-2).
- Provider dinamico / model default (Fagx-2).

## Riscos
- RPC nova precisa preservar comportamento atual do tick.
- Reload por chunk custa 1 query extra por envio (aceitavel: humanizacao
  ja tem sleep >= 800ms).
- Blocklist duplicada precisa cobrir os mesmos variantes do webhook para
  nao divergir.

## Prova minima
P3: script reproduzivel simulando (a) dois ticks concorrentes no mesmo
`message_id`, (b) handoff durante humanizacao, (c) nova mensagem durante
run antigo, (d) blocklist inserida entre schedule e tick. Cada cenario
termina com no maximo 1 envio real (mock do EvolutionProvider) e status
esperado em `RunAgentResult`.

## Dependencias
- Fhot done (lock ja existe no tick).
- F9 done (blocklist ja existe).