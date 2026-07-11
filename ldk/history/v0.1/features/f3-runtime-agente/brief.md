# F3 - Runtime do agente + modulo Agentes

## Objetivo
Fazer o agente de IA responder no WhatsApp de forma humanizada. Inbound
chega pelo webhook Evolution (F2 done), passa por um buffer de debounce,
e um runtime server-only monta contexto, chama LLM (OpenAI via contrato
`LLMProvider`), aplica humanizacao (chunk + delays + typing) e envia via
`ChannelProvider.sendText`. Modulo `/agentes` permite CRUD do agente e
ligar/desligar por conexao/conversa.

## Usuario
Operador unico. Cria 1 agente com prompt + tools + config de humanizacao,
associa a uma conexao, e mensagens novas passam a ser respondidas pela IA
ate ele "assumir" pela inbox (F4).

## Escopo v1
- Contrato `LLMProvider` em `src/providers/llm/types.ts` + `OpenAIProvider`
  server-only (chat completions). Sem stream v1 (resposta unica -> chunk).
- Registry de tools declarativas (`resetar`, `transferir_humano`) em
  `src/providers/tools/registry.server.ts`. `resetar` limpa historico da
  conversa; `transferir_humano` seta `conversations.assigned_to = 'human'`.
- Runtime `runAgentForMessage(messageId)` server-only:
  1. carrega conversation + agent + ultimas N mensagens;
  2. se `assigned_to != null` (humano) -> no-op;
  3. monta prompt (system_prompt + tools + historico);
  4. chama `LLMProvider.complete`;
  5. parsea tool_calls -> executa via registry;
  6. humaniza (split por sentenca, delay proporcional a tamanho, cap 8s,
     "typing" opcional via `ChannelProvider.sendTyping` se disponivel);
  7. envia via `ChannelProvider.sendText` e persiste em `messages`
     (`direction=outbound`, `status=sent`).
- Buffer/debounce: `agent_run_queue` (tabela leve) OU debounce por
  `conversation_id` usando `setTimeout` no processo do webhook (v1 aceita
  processamento sincrono no proprio webhook, dentro do handler, com
  timeout curto 15s). Decisao: sincrono no webhook, com flag para pular
  se ja ha run em progresso.
- Migration: adicionar coluna `agents.tools jsonb default '[]'` e
  `agents.humanization jsonb default '{"chunk":true,"min_ms":800,"max_ms":3500}'`
  se ainda nao existirem. Adicionar `conversations.assigned_to` ja existe.
- UI `/agentes`: lista + form CRUD (name, description, model,
  temperature, system_prompt em textarea grande, tools multiselect,
  humanization sliders, voice_id opcional [VERIFY]). Toggle `active`.
- Ligar agente por conexao: campo `connections.default_agent_id`
  (migration). Ao criar `conversations`, herdar `agent_id` da conexao.
- Segredos server-only: `OPENAI_API_KEY` (obrigatorio),
  `ELEVENLABS_API_KEY` (opcional, TTS fora do escopo v1).

## Fora de escopo
- TTS/audio de saida (voice) - fica para F3.1.
- Transcricao Whisper de audio inbound - fica para F3.1.
- Streaming de tokens.
- Inbox humano (assumir/devolver) - F4.
- Multi-agente por conversa, roteamento, RAG.
- Retry sofisticado / DLQ.

## Decisoes fixadas
- LLM inicial: OpenAI. Modelo default `gpt-4.1-mini` (confirmado pelo usuario).
- Runtime sincrono no proprio POST do webhook (aceito v1; risco: latencia
  do 200 ao Evolution ate ~15s). Se estourar timeout, responder 200 e
  logar erro no `webhook_events.error`.
- Humanizacao server-side (delay entre chunks via `await sleep`).
- Historico: ultimas 20 mensagens da conversa.
- `resetar` = comando textual "/resetar" do usuario limpa historico
  (soft: cria marker; runtime ignora mensagens antes do marker).

## Riscos
- OPENAI_API_KEY em bundle: JAMAIS. Import server-only + grep no dist.
- Prompt injection: system_prompt fixo, mensagens do usuario tratadas
  como user role; nunca executar shell/eval a partir de tool call.
- Loop infinito (bot -> bot): checar `direction=outbound` e ignorar.
- Custo LLM: cap de tokens por resposta (max_tokens=800) + rate por
  conversation (max 1 run em progresso).
- PII em log: nunca logar `content` de mensagem; so ids opacos.
- Webhook timeout do Evolution se runtime demorar: cap 12s hard; se
  exceder, salvar mensagem, responder 200, agendar retry manual (v1: log).

## Prova minima
P4 - Playwright E2E `/agentes` (CRUD), teste de runtime (curl no webhook
com payload inbound mock -> mensagem outbound gerada pelo LLM aparece em
`messages`), `supabase--linter` limpo, grep de segredos no bundle client,
revisao de seguranca do runtime.

## Dependencias
- F2 done (ok).
- [VERIFY] `OPENAI_API_KEY` (nao presente em `fetch_secrets` atual).
- Modelo OpenAI default: `gpt-4.1-mini` (confirmado).