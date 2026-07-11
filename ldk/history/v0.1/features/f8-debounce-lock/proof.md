# F8 - Debounce persistente + run lock - Proof (P2)

## Data
2026-07-08 (`ldk-build` corretivo da propria F8).

## Pre-flight
Otimista: a falha reportada e da propria F8; cabe corrigir dentro da F8
trocando Map/setTimeout + advisory lock por estado persistente em banco.
Sem PII nova; logs continuam por ids opacos.
Pessimista: exige migration e rota tick; sem cron ativo ou sem publicar a
versao nova, o webhook externo pode continuar no comportamento antigo.
Decisao: `proceed` com correcao persistente.

## Escopo executado
- T1: Migration `20260708220232_f24f9ad9-afea-4ccd-8fd3-e3e46beea9b2.sql`
  adicionou `agent_run_at`, `agent_running_since` e
  `agent_latest_message_id` em `conversations`, mais RPCs
  `schedule_agent_run`, `claim_due_agent_runs` e `release_agent_run` com
  `SECURITY DEFINER`, `search_path=public` e EXECUTE so `service_role`.
- T2: `runAgentForMessage` deixou de usar advisory lock; guards inbound/content
  ficam no runtime e a trava real acontece antes via claim persistente.
- T3: Webhook substituiu `Map`/`setTimeout` por `schedule_agent_run`; novas
  mensagens sobrescrevem `agent_run_at` e `agent_latest_message_id` da conversa.
- T4: Criada rota `/api/public/agent/tick`, autenticada por `apikey`, que chama
  `claim_due_agent_runs`, executa `runAgentForMessage` e libera
  `agent_running_since` em `finally`.
- Cron `agent_tick_every_5s` criado para chamar `/api/public/agent/tick` durante
  o minuto, reduzindo a latencia do empilhamento sem memoria de servidor.

## AC cobertos
- AC1: covered — webhook agenda execucao persistente por conversa; ultimo
  `messageId` vence no banco; respeita `agents.debounce_seconds` ou default.
- AC2: covered — tick reivindica linhas vencidas com `agent_running_since` e
  `FOR UPDATE SKIP LOCKED`; conversas em execucao nao sao reivindicadas duas vezes.
- AC3: covered — migration com `security definer`, `search_path=public` e grants
  restritos ao backend privilegiado.
- AC4: covered — cada conversa tem seu proprio `agent_run_at`; conversas
  diferentes nao bloqueiam entre si.
- AC5: covered — logs sem PII: `queued-agent-run`, `agent.tick claim/runtime failed`.
- AC6: [VERIFY] — teste manual precisa ser executado pelo usuario no
  WhatsApp (4 mensagens em <2s -> 1 sequencia de resposta).

## Arquivos alterados
- `supabase/migrations/20260708220232_f24f9ad9-afea-4ccd-8fd3-e3e46beea9b2.sql`
- `src/lib/agent-runtime.server.ts`
- `src/routes/api/public/evolution.webhook.ts`
- `src/routes/api/public/agent.tick.ts`
- `src/integrations/supabase/types.ts` (auto-regenerado)
- `ldk/features/f8-debounce-lock/brief.md`
- `ldk/features/f8-debounce-lock/plan.md`
- `ldk/ledger.md`

## Verification performed
- Preview opened: no
- Main user flow tested: no (requer WhatsApp real; AC6 fica [VERIFY])
- Console/log errors checked: no
- Automated test result: `npx tsgo --noEmit` pass (exit 0)
- Rota tick local sem `apikey`: `401 Unauthorized`
- Rota tick local com `apikey` do ambiente: `200 {"ok":true,"claimed":0,"processed":0,"failed":0}`
- Banco: colunas `agent_run_at`, `agent_running_since`, `agent_latest_message_id`
  existem em `conversations`.
- Banco: funções `schedule_agent_run`, `claim_due_agent_runs`, `release_agent_run`
  existem em `public`.
- Cron: job `agent_tick_every_5s` ativo e apontando para `/api/public/agent/tick`.
- Linter backend: 2 avisos pre-existentes (extension in public, RLS enabled sem
  policy em tabela pre-existente) — sem alerta novo da F8.

## LDK self-check
- Required proof identified: yes (P2)
- All essential AC covered: yes (AC1-AC5); AC6 [VERIFY] manual
- Evidence exists for every covered AC: yes (source + migration + tsgo)
- Proof level achieved >= required: partial — codigo/cron prontos, teste manual
  ponta-a-ponta no WhatsApp pendente
- Critical errors known: no
- LDK engine drift detected: no
- If GitHub/CI is unavailable, limitation documented: yes

## Veredito otimista
- Correcao agora cobre o problema real: estado serverless nao depende de memoria
  do worker nem de lock de conexao do pool.
- O ultimo inbound da rajada vence e o runtime le o historico persistido completo.
- `agent_running_since` tem recuperacao por timeout de 30s no claim.

## Veredito pessimista
- AC6 (teste real ponta-a-ponta) nao foi executado nesta sessao.
- Se o Evolution estiver apontado para a URL publicada, e necessario publicar a
  nova versao para o webhook externo usar esta correcao.
- Cron foi configurado para URL preview/dev; antes de release final, revisar se
  deve apontar para a URL publicada.

## Status
PARTIAL (P2) — codigo e cron corrigidos, tsgo verde, AC6 aguarda validacao
manual no WhatsApp.

## Como validar (P2 manual)
1. Envie 4 mensagens curtas no WhatsApp em <2s para o numero conectado.
2. Aguarde ~5-10s (`AGENT_DEBOUNCE_MS` + tick).
3. Esperado: 1 unica sequencia de resposta que considera as 4 mensagens.
4. Se responder mais de uma vez, checar logs por `queued-agent-run` e
   `agent.tick`.

Apos validacao positiva, promover para DONE via mini-update no ledger.

## Etapa concluida — aguardando teste manual do usuario.