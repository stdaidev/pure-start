# F9 - Blocklist do agente - Proof (P2)

## Status
PARTIAL — codigo e migration prontos, tsgo verde. AC5 [VERIFY] aguarda teste
manual no WhatsApp.

## Escopo executado
- Migration `agent_ignored_numbers` com GRANT + RLS por workspace default.
- Server fns `listIgnoredNumbers`, `addIgnoredNumber`, `removeIgnoredNumber`
  com normalizacao E.164 (`src/lib/phone.ts`).
- Card `IgnoredNumbersCard` integrado a `/agentes`.
- Webhook: guard consulta `agent_ignored_numbers` antes de
  `schedule_agent_run`; se blocked, loga `ignored-number conversation=<id>`
  e nao agenda.

## AC
- AC1: covered (migration).
- AC2: covered (fns + upsert onConflict workspace_id,phone_e164).
- AC3: covered (rota `/agentes` renderiza o card).
- AC4: covered em codigo; validacao manual em AC5.
- AC5: [VERIFY] manual.

## Verification performed
- Preview opened: no
- Automated test result: `npx tsgo --noEmit` pass (exit 0)
- Linter backend: 2 avisos pre-existentes; nenhum alerta novo da F9.

## LDK self-check
- Required proof identified: yes (P2)
- All essential AC covered: partial (AC5 manual)
- Evidence exists for every covered AC: yes
- Proof level achieved >= required: partial
- Critical errors known: no
- LDK engine drift detected: no

## Veredito otimista
- Guard fica antes do `schedule_agent_run`; mensagem continua sendo gravada
  na inbox — so nao aciona o agente.
- Normalizacao E.164 alinhada ao restante do app.

## Veredito pessimista
- Teste ponta-a-ponta no WhatsApp nao foi executado nesta sessao.

## Como validar (P2 manual)
1. Em `/agentes`, cadastre o telefone (ex.: 28999914358).
2. Envie mensagem daquele numero para o WhatsApp conectado.
3. Esperado: mensagem na conversa, agente NAO responde.
4. Remova o numero -> agente volta a responder.
