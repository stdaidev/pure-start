# F8 - Debounce + run lock por conversa

## Objetivo
Evitar que rajadas de mensagens inbound (usuario mandando 3-6 mensagens
seguidas) disparem N execucoes concorrentes do runtime do agente, gerando
respostas duplicadas/quase identicas. Solucao combina:

1. **Debounce persistente por conversation_id**: o webhook grava em
   `conversations.agent_run_at` uma janela curta (default 4s) e sempre
   sobrescreve com a ultima mensagem da conversa.
2. **Run lock persistente por linha**: o tick do agente reivindica conversas
   vencidas com `claim_due_agent_runs`, marca `agent_running_since` e libera
   com `release_agent_run` no `finally`.

O historico ja e persistente (mensagens ficam em `messages`), entao o run
unico ve todas as mensagens da rajada de uma vez.

## Usuario
Operador que conecta agente ao WhatsApp; usuario final que envia varias
mensagens curtas seguidas.

## Escopo v1 corrigido
- Debounce persistente no banco via colunas `agent_run_at`,
  `agent_latest_message_id` e `agent_running_since` em `conversations`.
- Webhook apenas chama `schedule_agent_run(conversation_id, message_id,
  delay_ms)`; nao usa `Map` nem `setTimeout`.
- Rota `/api/public/agent/tick` chama `claim_due_agent_runs`, executa
  `runAgentForMessage(message_id)` e chama `release_agent_run` no `finally`.
- Janela debounce configuravel por env `AGENT_DEBOUNCE_MS` (default 4000) ou
  por `agents.debounce_seconds`; cap superior 10s.
- Metrica minima: log estruturado sem PII quando agenda, reivindica ou falha.

## Fora de escopo
- Tabela dedicada `agent_run_queue`; F8 usa a propria linha de `conversations`
  como fila/trava persistente.
- Memoria de longo prazo (rolling summary, embeddings).
- Retry/backoff sofisticado.

## Decisoes fixadas
- Debounce em memoria e advisory lock de sessao foram rejeitados para F8 após
  falharem em ambiente serverless/pool de conexoes.
- A correcao oficial da F8 e persistente no banco.

## Riscos
- Tick precisa estar chamado periodicamente; sem cron ativo, a conversa fica
  agendada mas nao processa.
- Se o runtime travar, `agent_running_since` com mais de 30s e recuperado no
  proximo claim.
- Debounce muito longo -> UX ruim; cap 10s.

## Prova minima
P2 - teste manual: enviar 4 mensagens em 2s pelo WhatsApp, acionar/aguardar o
tick e observar 1 resposta agrupada em vez de 4. Verificar log do agendamento.

## Dependencias
- F3 done (runtime existe).