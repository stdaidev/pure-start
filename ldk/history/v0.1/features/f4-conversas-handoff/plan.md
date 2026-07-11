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
| T1 | Server functions: `listConversations`, `getMessages`, `assignConversation`, `sendConversationMessage` com Zod + guard. | AC1, AC3, AC4 | `src/lib/conversations.functions.ts` | `tsgo` verde. | done |
| T2 | UI `/conversas`: layout split. | AC1, AC2 | `src/routes/_shell.conversas.tsx`, `src/components/conversas/*` | Playwright screenshot lista + painel. | done |
| T3 | Componentes `MessageList` + `Composer`. | AC2, AC4 | `src/components/conversas/message-list.tsx`, `src/components/conversas/composer.tsx` | Screenshot bubbles + composer disabled. | done |
| T4 | Botoes Assumir/Devolver. | AC3, AC6 | edit `src/routes/_shell.conversas.tsx` | Botao visivel no screenshot. | done |
| T5 | Realtime `useConversationsRealtime`. | AC5 | `src/hooks/use-conversations-realtime.ts` | Subscribe sem erro. | done |
| T6 | Prova P2 + proof.md. | AC1-AC7 | `ldk/features/f4-conversas-handoff/proof.md` | Ver proof.md. | done |

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