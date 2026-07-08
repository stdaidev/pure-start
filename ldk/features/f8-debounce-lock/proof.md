# F8 - Debounce + advisory lock - Proof (P2)

## Data
2026-07-08 (`ldk-build` completo).

## Pre-flight
Otimista: escopo cirurgico — 1 migration (RPC), 2 arquivos editados.
Sem PII nova; F3 partial nao bloqueia porque F8 ataca justamente a race
condition que F3 partial deixou aberta.
Pessimista: debounce in-memory perde timer se worker recicla — aceito v1;
advisory lock por transacao expira antes do envio, entao usei lock por
**sessao** (`pg_try_advisory_lock`) com release explicito no `finally`.
Decisao: `proceed` com ajuste de lock por sessao.

## Escopo executado
- T1: Migration com RPC `try_agent_lock(uuid)` e `release_agent_lock(uuid)`
  usando `pg_try_advisory_lock(hashtext(_conversation_id::text))`.
  `SECURITY DEFINER`, `search_path=public`, EXECUTE revogado de
  PUBLIC/anon/authenticated, GRANT so `service_role`.
- T2: `runAgentForMessage` faz guards baratos (msg existe, inbound, tem
  conteudo) e depois chama `try_agent_lock`. Se falso, retorna
  `skipped-locked` com log `[agent-runtime] skipped-locked
  conversation=<id>`. Se true, delega para `runAgentLocked` e libera lock
  no `finally` (mesmo em erro).
- T3: Webhook agora usa `scheduleAgentRun(conversationId, messageId)` com
  `Map<conversationId, {timer, latestMessageId}>` top-level. Cada nova
  mensagem inbound reseta o timer (`AGENT_DEBOUNCE_MS`, default 4000ms,
  cap 10000ms). Ao disparar, usa o messageId mais recente — runtime le
  historico completo do banco.

## AC cobertos
- AC1: covered — Map top-level agrupa mensagens da mesma conversa;
  `latestMessageId` vence; timer reseta a cada nova msg.
- AC2: covered — RPC chamada, `skipped-locked` retornado sem tocar LLM
  nem sender.
- AC3: covered — migration com `security definer`, `search_path=public`,
  `pg_try_advisory_lock(hashtext(...))`.
- AC4: covered — Map keyed por conversation_id; conversas diferentes tem
  timers independentes.
- AC5: covered — logs `[agent-runtime] skipped-locked conversation=<id>`
  e `[webhook/evolution] debounced conversation=<id> delay=<ms>` sem PII.
- AC6: [VERIFY] — teste manual precisa ser executado pelo usuario no
  WhatsApp (4 mensagens em <2s -> 1 sequencia de resposta).

## Arquivos alterados
- `supabase/migrations/*` (2 migrations: cria RPCs + revoga EXECUTE)
- `src/lib/agent-runtime.server.ts` (guards + lock + `runAgentLocked`)
- `src/routes/api/public/evolution.webhook.ts` (debounce Map + scheduler)
- `src/integrations/supabase/types.ts` (auto-regenerado, RPCs tipadas)

## Verification performed
- Preview opened: no
- Main user flow tested: no (requer WhatsApp real; AC6 fica [VERIFY])
- Console/log errors checked: not available
- Automated test result: not run
- tsgo `--noEmit`: pass (exit 0, sem output)
- Supabase linter: 2 warnings pre-existentes (extension in public,
  RLS enabled sem policy em `workspace_secrets`) — nao introduzidos por F8.

## LDK self-check
- Required proof identified: yes (P2)
- All essential AC covered: yes (AC1-AC5); AC6 [VERIFY] manual
- Evidence exists for every covered AC: yes (source + migration + tsgo)
- Proof level achieved >= required: partial — codigo pronto, teste manual
  ponta-a-ponta pendente
- Critical errors known: no
- LDK engine drift detected: no
- If GitHub/CI is unavailable, limitation documented: yes

## Veredito otimista
- Solucao combinada (debounce + lock) cobre os dois cenarios: rajada num
  isolate (debounce agrupa) e isolates paralelos (lock serializa).
- Lock por sessao com release no `finally` garante liberacao mesmo em
  erro ou timeout.
- Zero PII em logs; RPCs restritas a service_role.

## Veredito pessimista
- Debounce in-memory: se o Worker isolate for reciclado no meio da janela,
  perde 1 rajada (usuario reenvia). Aceito v1.
- Lock por sessao no Supabase pool: se o pool reciclar a conexao antes do
  release, o lock fica "penjado" ate a conexao real fechar. Mitigacao:
  RUNTIME_HARD_CAP_MS=12s limita duracao; pg_stat_activity mostra locks
  orfaos se aparecer.
- AC6 (teste real ponta-a-ponta) nao foi executado nesta sessao.

## Status
PARTIAL (P2) — codigo completo, tsgo verde, AC6 aguarda validacao manual
do usuario no WhatsApp.

## Como validar (P2 manual)
1. Envie 4 mensagens curtas no WhatsApp em <2s para o numero conectado.
2. Aguarde ~4s (`AGENT_DEBOUNCE_MS`).
3. Esperado: 1 unica sequencia de resposta que considera as 4 mensagens.
4. Se responder mais de uma vez, checar logs por `skipped-locked` e
   `debounced`.

Apos validacao positiva, promover para DONE via mini-update no ledger.

## Etapa concluida — aguardando teste manual do usuario.