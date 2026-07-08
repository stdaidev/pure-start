# F8 - Debounce + run lock por conversa

## Objetivo
Evitar que rajadas de mensagens inbound (usuario mandando 3-6 mensagens
seguidas) disparem N execucoes concorrentes do runtime do agente, gerando
respostas duplicadas/quase identicas. Solucao combina:

1. **Debounce por conversation_id** no webhook: aguarda uma janela curta
   (default 4s) antes de disparar `runAgentForMessage`, agrupando mensagens
   da mesma conversa numa unica execucao.
2. **Advisory lock Postgres** (`pg_try_advisory_xact_lock(hashtext(conversation_id))`)
   dentro de `runAgentForMessage`: se ja ha uma execucao ativa para essa
   conversa, sai sem duplicar.

O historico ja e persistente (mensagens ficam em `messages`), entao o run
unico ve todas as mensagens da rajada de uma vez.

## Usuario
Operador que conecta agente ao WhatsApp; usuario final que envia varias
mensagens curtas seguidas.

## Escopo v1
- Debounce em memoria (Map<conversationId, timer>) dentro do handler do
  webhook. Ultimo message-id vence; ao disparar, roda apenas 1x com o
  message mais recente (o runtime le historico completo).
- Advisory lock via RPC `try_agent_lock(conversation_id uuid)` que
  encapsula `pg_try_advisory_xact_lock` numa transacao curta. Se lock
  falhar, run retorna `skipped-locked`.
- Janela debounce configuravel por env `AGENT_DEBOUNCE_MS` (default 4000);
  cap superior 10s.
- Metrica minima: log estruturado `[agent-runtime] locked/skipped` sem PII.

## Fora de escopo
- Fila persistente (tabela `agent_run_queue`) - futuro se precisar escalar
  para multiplos workers.
- Memoria de longo prazo (rolling summary, embeddings).
- Retry/backoff sofisticado.

## Decisoes fixadas
- Debounce em memoria: aceito pois Cloudflare Worker isolate por regiao ja
  serializa por instancia; se rodar em multiplos isolates simultaneos o
  advisory lock cobre a race.
- Advisory lock por transacao (auto-libera no commit/rollback).

## Riscos
- Isolates paralelos: mitigado pelo advisory lock.
- Timer perdido se worker for reciclado durante a janela: perde 1 rajada;
  aceitavel v1 (usuario reenvia). Log warn.
- Debounce muito longo -> UX ruim; cap 10s.

## Prova minima
P2 - teste manual: enviar 4 mensagens em 2s pelo WhatsApp e observar 1
resposta agrupada em vez de 4. Verificar log do lock.

## Dependencias
- F3 done (runtime existe).