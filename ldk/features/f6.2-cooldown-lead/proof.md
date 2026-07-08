# F6.2 - Cooldown por lead - Proof

## Resumo
Migration adiciona `workspaces.cooldown_default_hours` (default 24), `campaigns.cooldown_enabled/value/unit` com CHECK, e index em `messages(workspace_id, direction, created_at DESC)`. `createCampaign` calcula janela efetiva = `max(default_workspace, pedido)`, cruza `contacts -> conversations -> messages inbound` da janela e marca recipients afetados como `stopped_recent_reply` no insert. Worker (`dispatch-worker.server.ts`) re-checa cooldown antes de cada envio (defesa em profundidade) e nao consome cota horaria/diaria quando bloqueia. Wizard tem bloco Cooldown (switch + numero + selector horas/dias) com validacao min = default do workspace. `/configuracoes` ganha secao "Cooldown padrao por lead" com input + selector + botao Salvar. Badge cinza "COOLDOWN" e novo card contador no monitor da campanha.

## Pre-flight
Otimista: extensao incremental dos padroes ja provados de F6/F6.1. Reusa `messages.inbound` do F4. Migration pequena.
Pessimista: prova real de envio nao foi executada (poupar reputacao das instancias); validacao foi via typecheck + smoke UI. Cooldown terminal por design (recipient marcado no create nao volta a `pending` se janela expirar antes do envio).
Decisao: proceed com prova P2 via typecheck + smoke UI + inspecao de codigo.

## AC cobertos
- AC1: Badge `stopped_recent_reply` -> "COOLDOWN" cinza em `status-badge.tsx`. (covered)
- AC2: `workspaces.cooldown_default_hours int default 24` na migration; UI de config em `/configuracoes` (screenshot `1_config.png`). (covered)
- AC3: `campaigns` ganha `cooldown_enabled bool default true`, `cooldown_value int`, `cooldown_unit text` com CHECK `(hours|days)`. (covered)
- AC4: Wizard tem bloco Cooldown com switch + numero + selector horas/dias + validacao `cooldownBelowMin`. (covered)
- AC5: `createCampaign` cruza phones -> contacts -> conversations -> messages inbound dentro da janela efetiva e marca `stopped_recent_reply` no insert. (covered)
- AC6: Worker re-checa cooldown antes de mandar; `continue` sem decrementar `remaining` nem `sent_this_hour`. (covered)
- AC7: Monitor exibe card "cooldown" (grid alterado de 5 para 6 colunas). (covered)
- AC8: `bunx tsgo --noEmit` verde. 3 cenarios: com cooldown default (screenshot config), sem cooldown (switch off no wizard), unidade dias (selector). Envio real omitido por politica. (partial — envio real nao rodado)

## Verificacao executada
- Preview opened: yes (`/configuracoes`)
- Main user flow tested: no (envio real omitido)
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
- Proof level achieved >= required: partial (P2 pedido; smoke + inspecao entregue, envio real nao)
- Critical errors known: no
- LDK engine drift detected: no
- If GitHub/CI is unavailable, limitation documented: yes

## Proof verdict
Otimista:
- Codigo compila, migration aplicada, UI renderiza, integracoes com F4/F5/F6.1 preservadas.
Pessimista:
- Envio real via Evolution nao foi validado; recomenda-se teste manual pelo usuario com telefone que ja respondeu para confirmar que o create marca `stopped_recent_reply`.

## Evidence
- Screenshot: `/tmp/browser/f62/1_config.png` (secao Cooldown padrao renderizada em `/configuracoes`).
- Migration aplicada: `workspaces.cooldown_default_hours`, `campaigns.cooldown_enabled/value/unit`, `idx_messages_ws_direction_created`.
- Typecheck: `bunx tsgo --noEmit` exit 0.

## Known limitations
- Envio real nao executado; validado por smoke + typecheck + inspecao.
- Recipient marcado como `stopped_recent_reply` no create fica terminal (nao volta a `pending` se a janela expirar).
- Wizard nao expoe UI para setar cooldown padrao via campanha (usa switch + valor; unidade horas/dias). Ajuste global fica em `/configuracoes`.

## Status
**PARTIAL** — implementacao completa, prova real de envio pendente. Fluxo manual do usuario com telefone que respondeu pode promover para DONE.

## Etapa concluida
Build F6.2 concluido, aguardando proximo comando.