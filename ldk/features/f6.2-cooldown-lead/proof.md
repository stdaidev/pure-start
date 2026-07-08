# F6.2 - Cooldown por lead - Proof

## Resumo
Migration adiciona `workspaces.cooldown_default_hours` (default 24), `campaigns.cooldown_enabled/value/unit` com CHECK, e index em `messages(workspace_id, direction, created_at DESC)`. `createCampaign` calcula janela efetiva = `max(default_workspace, pedido)`, cruza `contacts -> conversations -> messages inbound` da janela e marca recipients afetados como `stopped_recent_reply` no insert. Worker (`dispatch-worker.server.ts`) re-checa cooldown antes de cada envio (defesa em profundidade) e nao consome cota horaria/diaria quando bloqueia. Wizard tem bloco Cooldown (switch + numero + selector horas/dias) com validacao min = default do workspace. `/configuracoes` ganha secao "Cooldown padrao por lead" com input + selector + botao Salvar. Badge cinza "COOLDOWN" e novo card contador no monitor da campanha.

Ajuste pos-teste (fix): normalizacao de telefone divergia entre webhook (MSISDN `55<ddd><num>`) e createCampaign (digits crus). Corrigido em `campaigns.functions.ts` e `dispatch-worker.server.ts` para canonicalizar em MSISDN e testar variantes (com/sem `55`), alem de deduplicar telefones dentro do lote. Teste manual do usuario confirmou: campanha `dps2_1h` marcou o telefone que respondeu como `COOLDOWN` (screenshot fornecido pelo usuario).

## Pre-flight
Otimista: extensao incremental dos padroes ja provados de F6/F6.1. Reusa `messages.inbound` do F4. Migration pequena.
Pessimista: prova real de envio nao foi executada (poupar reputacao das instancias); validacao foi via typecheck + smoke UI. Cooldown terminal por design (recipient marcado no create nao volta a `pending` se janela expirar antes do envio).
Decisao: proceed com prova P2 via typecheck + smoke UI + inspecao de codigo.

## AC cobertos
- AC1: Badge `stopped_recent_reply` -> "COOLDOWN" cinza confirmado no monitor da campanha `dps2_1h`. (covered)
- AC2: `workspaces.cooldown_default_hours int default 24` + UI de config em `/configuracoes`. (covered)
- AC3: `campaigns` ganha `cooldown_enabled bool default true`, `cooldown_value int`, `cooldown_unit text` CHECK `(hours|days)`. (covered)
- AC4: Wizard tem bloco Cooldown com switch + numero + selector horas/dias + validacao `cooldownBelowMin`. (covered)
- AC5: `createCampaign` cruza phones -> contacts -> conversations -> messages inbound dentro da janela e marca `stopped_recent_reply` no insert; validado por teste manual real do usuario. (covered)
- AC6: Worker re-checa cooldown antes de mandar; sem consumo de cota. (covered)
- AC7: Monitor exibe card "COOLDOWN" (contador = 1 no teste real). (covered)
- AC8: `bunx tsgo --noEmit` verde. Fluxo manual real: telefone que respondeu foi marcado como COOLDOWN, telefone sem inbound ficou PENDENTE. (covered)

## Verificacao executada
- Preview opened: yes (`/configuracoes` + monitor `dps2_1h`)
- Main user flow tested: yes (usuario criou campanha real, telefone que respondeu virou COOLDOWN)
- Responsive/mobile checked: no
- Console/log errors checked: not available
- GitHub diff available: not applicable
- Automated test available: no
- Automated test result: not run
- CI result: not run

## LDK self-check
- Required proof identified: yes
- All essential AC covered: yes
- Evidence exists for every covered AC: yes (codigo + screenshot config)
- Proof level achieved >= required: yes (P2 pedido; fluxo manual real executado)
- Critical errors known: no
- LDK engine drift detected: no
- If GitHub/CI is unavailable, limitation documented: yes

## Proof verdict
Otimista:
- Fluxo real validado: campanha marcou o telefone que respondeu como COOLDOWN, contador do monitor refletiu 1, pendente ficou pendente. Fix de normalizacao MSISDN resolveu o mismatch inicial.
Pessimista:
- Recipient marcado permanece terminal se a janela expirar antes do envio (comportamento planejado). Duplicatas na planilha ficam deduplicadas apenas dentro do mesmo insert; duplicata cross-campaign nao e resolvida.

## Evidence
- Screenshot fornecido pelo usuario: monitor `dps2_1h` com COOLDOWN=1, PENDENTES=1, badge cinza "COOLDOWN" no telefone `5524****96`.
- Screenshot: `/tmp/browser/f62/1_config.png` (secao Cooldown padrao renderizada em `/configuracoes`).
- Migration aplicada: `workspaces.cooldown_default_hours`, `campaigns.cooldown_enabled/value/unit`, `idx_messages_ws_direction_created`.
- Fix pos-teste: `campaigns.functions.ts` + `dispatch-worker.server.ts` (normalizacao MSISDN + variantes).
- Typecheck: `bunx tsgo --noEmit` exit 0.

## Known limitations
- Recipient marcado como `stopped_recent_reply` no create fica terminal (nao volta a `pending` se a janela expirar).
- Deduplicacao de telefone ocorre apenas dentro do mesmo insert de campanha.

## Status
**DONE** — fluxo manual real validado pelo usuario apos fix de normalizacao MSISDN.

## Etapa concluida
Proof F6.2 registrado como DONE, aguardando proximo comando.