# F6.2 - Cooldown por lead - Plan

Feature: F6.2 - Cooldown por lead
Risk: medio
Proof required: P2
Cerimonia: medio completa
Modo de execucao recomendado: `ldk-build`

## Acceptance criteria
- AC1: Novo status `stopped_recent_reply` (badge cinza, rotulo "COOLDOWN") aparece no monitor.
- AC2: `workspaces.cooldown_default_hours int default 24`. Configuravel em `/configuracoes` (input numero + selector horas/dias, guarda em horas).
- AC3: `campaigns` ganha `cooldown_enabled bool default true`, `cooldown_value int null`, `cooldown_unit text check in (hours,days) null`. Null herda default do workspace.
- AC4: Wizard tem bloco "Cooldown por lead": switch on/off, input numero, selector horas/dias. Validacao impede janela abaixo do default do workspace.
- AC5: `createCampaign` filtra a lista antes de inserir recipients: se existe `messages` inbound do workspace pra aquele telefone dentro da janela efetiva, recipient nasce como `stopped_recent_reply` (nao entra na fila).
- AC6: Worker re-checa antes de enviar: se apareceu inbound depois do create, marca `stopped_recent_reply` e nao consome cota horaria/diaria.
- AC7: Monitor exibe contador de `stopped_recent_reply` nos cards do topo (ao lado de "respondeu").
- AC8: `bunx tsgo --noEmit` verde. Fluxo manual cobre 3 cenarios (com cooldown padrao, sem cooldown, unidade dias).

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration: `workspaces.cooldown_default_hours`; `campaigns.cooldown_enabled/value/unit` com CHECK; ampliar CHECK de `campaign_recipients.status` para incluir `stopped_recent_reply`; index em `messages(workspace_id, direction, created_at)` se ainda nao existir | AC1, AC2, AC3 | `supabase/migrations/*.sql` | supabase linter | ready |
| T2 | `workspace.functions.ts`: `getWorkspaceFlags` retorna `cooldown_default_hours`; `updateWorkspaceCooldown({value, unit})` grava sempre em horas. UI em `/configuracoes`: input numero + selector horas/dias com toast | AC2 | `src/lib/workspace.functions.ts`, `src/routes/_shell.configuracoes.tsx` | preview manual | ready |
| T3 | `createCampaign`: aceita `cooldown_enabled/value/unit`, calcula janela efetiva `max(pedido_horas, workspace_default)`, faz um SELECT DISTINCT de `messages` inbound por telefone dentro da janela, marca recipients afetados como `stopped_recent_reply` no insert em vez de `pending` | AC3, AC5 | `src/lib/campaigns.functions.ts` | tsgo + query direta | ready |
| T4 | Worker: helper `isInCooldown(phone, workspaceId, windowHours)` chamado antes do envio. Se true, marca `stopped_recent_reply` e nao decrementa `remaining` nem `sent_this_hour` | AC6 | `src/lib/dispatch-worker.server.ts` | preview manual + query direta | ready |
| T5 | Wizard: bloco "Cooldown por lead" (switch + numero + selector horas/dias). Texto claro: "nao enviar se o lead respondeu nos ultimos N". Validacao min = default do workspace | AC4 | `src/components/disparos/new-campaign-dialog.tsx` | preview manual | ready |
| T6 | Badge `stopped_recent_reply` (cinza, "COOLDOWN") em `status-badge.tsx`; card contador no topo de `/disparos/$id` | AC1, AC7 | `src/components/disparos/status-badge.tsx`, `src/routes/_shell.disparos.$id.tsx` | preview manual | ready |
| T7 | Prova P2: 3 fluxos manuais + screenshots em `proof.md` | AC1-AC8 | `ldk/features/f6.2-cooldown-lead/proof.md` | manual + tsgo | ready |

## Fluxo

```text
[Wizard] cooldown_enabled + valor + unidade
   -> createCampaign
      -> janela efetiva = max(pedido_horas, workspace_default_hours)
      -> DISTINCT contact_phone WHERE messages.inbound AND created_at > now() - janela
      -> recipient nasce como pending OU stopped_recent_reply
   -> worker (tick)
      -> antes de enviar: isInCooldown(phone, ws, janela)? -> stopped_recent_reply (nao consome cota)
      -> senao envia
```

## Detalhes tecnicos
- Janela sempre normalizada em horas. `days` -> `value * 24`.
- Nunca abaixo do default do workspace (validacao no wizard + no server no createCampaign).
- Index recomendado: `messages(workspace_id, direction, created_at DESC)` para o SELECT DISTINCT nao virar seq scan.
- Re-check no worker usa a mesma janela armazenada na campanha (calculada e persistida em `campaigns.cooldown_value/unit`).
- `stopped_recent_reply` e status terminal nessa campanha; nao volta para `pending` mesmo se a janela expirar.

## Checklist de seguranca / anti-ban
- [ ] Janela minima do workspace nunca pode ser burlada pela flag da campanha.
- [ ] `stopped_recent_reply` nao consome cota horaria nem diaria.
- [ ] Nenhum log novo com telefone ou conteudo de mensagem.
- [ ] Nao regride F6.1: stop-on-reply em campanhas running continua funcionando (rodam em paralelo).

## Pre-flight otimista
Extende padroes ja existentes (novo status + filtro no create + re-check no worker). Sem novas dependencias
externas. Migration pequena. Reutiliza `messages.inbound` que ja existe do F4.

## Pre-flight pessimista
- Planilhas grandes: SELECT DISTINCT sem index pode ficar lento; T1 garante index.
- Ambiguidade UX: operador pode achar que cooldown = "nao enviar por N tempo mesmo sem inbound". Wizard precisa texto explicito.
- Recipient que ficou `stopped_recent_reply` no create fica terminal mesmo se a janela expirar antes do envio; documentar como esperado.

## Status no ledger
F6.2: `idea` -> `approved`.

## Etapa concluida
Plano F6.2 aprovado e aguardando `/ldk-build`.