# F4 - Conversas/inbox + handoff - Plan

## Feature
F4 - Conversas/inbox + handoff (assumir/devolver IA)

## Risk
medio

## Proof required
P2

## Cerimonia
medio - plano completo, `ldk-build` autorizado (sem decisao critica aberta).

## Modo de execucao recomendado
`ldk-build` (as tasks nao tocam auth, pagamento, migracao destrutiva nem
segredo novo; guard do runtime ja existe em `agent-runtime.server.ts` via
`conv.assigned_to`).

## Acceptance criteria
- AC1: Rota `/conversas` lista conversas do workspace default ordenadas
  por `last_message_at` desc; mostra nome/telefone do contato, ultima
  mensagem (truncada), timestamp relativo e badge de estado (`IA` quando
  `assigned_to is null`, `Humano` quando setado, `Sem agente` quando
  `agent_id is null`).
- AC2: Ao selecionar uma conversa, painel direito mostra historico de
  `messages` em ordem cronologica, com bubbles diferenciadas para
  `direction=inbound` vs `outbound` e etiqueta "IA" em outbound quando a
  conversa tem `agent_id` e nao esta assumida (best-effort).
- AC3: Botao "Assumir" seta `assigned_to='human'`; botao "Devolver para IA"
  zera `assigned_to`. Estado reflete na badge imediatamente.
- AC4: Composer de texto so fica habilitado quando `assigned_to` esta
  setado. Envio chama `EvolutionProvider.sendText` via server function,
  persiste `messages` com `direction=outbound` e atualiza
  `conversations.last_message_at`.
- AC5: Realtime: canal Supabase em `messages` (filtrado por
  `workspace_id`) atualiza lista e painel sem refresh manual.
- AC6: Runtime continua respeitando o guard - conversa assumida nao
  recebe resposta automatica (ja implementado em F3, coberto por prova
  manual aqui).
- AC7: `tsgo` verde, `supabase--linter` limpo, sem `content` em logs.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Server functions: `listConversations`, `getConversation` (com contact/agent/connection joins), `getMessages(conversation_id, limit)`, `assignConversation(id, to: 'human'\|null)`, `sendConversationMessage(id, text)` com Zod + guard "so envia se assigned_to setado". | AC1, AC3, AC4 | `src/lib/conversations.functions.ts` | `tsgo` verde. | ready |
| T2 | UI `/conversas`: layout split (lista esquerda 320px + painel direita), estados de loading/empty, selecao via query param `?c=<id>`. Badges com tokens HUD ja existentes. | AC1, AC2 | `src/routes/_shell.conversas.tsx`, `src/components/conversas/*` | Playwright: rota renderiza sem pageerror; screenshot lista + painel. | ready |
| T3 | Componente `MessageList` (bubbles inbound/outbound, etiqueta IA, timestamp) e `Composer` (textarea + botao enviar, disabled quando conversa nao assumida). | AC2, AC4 | `src/components/conversas/message-list.tsx`, `src/components/conversas/composer.tsx` | Screenshot bubbles + composer disabled/enabled. | ready |
| T4 | Botoes "Assumir" / "Devolver para IA" no header do painel; chamam `assignConversation` e invalidam queries. | AC3, AC6 | edit `src/routes/_shell.conversas.tsx` | Manual: assumir troca badge e habilita composer; devolver desabilita. | ready |
| T5 | Realtime: hook `useConversationsRealtime` (canal em `messages` filtrado por `workspace_id`) que invalida `['conversations']` e `['messages', id]` no queryClient em INSERT/UPDATE. | AC5 | `src/hooks/use-conversations-realtime.ts`, wire em `/conversas` | Manual: enviar msg via WhatsApp cai no painel sem refresh. | ready |
| T6 | Prova P2: Playwright smoke (rota renderiza, lista aparece) + registro do fluxo manual (assumir, enviar, devolver, IA volta a responder). Atualizar `proof.md`. | AC1-AC7 | `ldk/features/f4-conversas-handoff/proof.md` | Ver `proof.md`. | ready |

## Arquivos criados/alterados (esperados)
- src/lib/conversations.functions.ts (novo)
- src/routes/_shell.conversas.tsx (substituir placeholder)
- src/components/conversas/message-list.tsx (novo)
- src/components/conversas/composer.tsx (novo)
- src/components/conversas/conversation-list.tsx (novo)
- src/hooks/use-conversations-realtime.ts (novo)
- ldk/features/f4-conversas-handoff/proof.md (no build)

## Fora de escopo
- Media (audio/imagem/documento) — placeholder textual.
- Multi-usuario (segue single-user; `assigned_to='human'` literal).
- Templates/snippets, tags, filtros avancados, busca full-text.

## Roadmap/dependencias
- Depende de F2 (envio) e F3 (guard do runtime + dados em `messages`).
- Desbloqueia visibilidade do agente em producao e prepara base para F5/F6.