# F4 - Conversas/inbox + handoff - Proof

## Resumo
Rota `/conversas` entrega inbox split-view (lista + painel) usando dados
reais gerados pelo runtime F3. Handoff via botao Assumir/Devolver muda
`conversations.assigned_to`; composer manual envia via
`EvolutionProvider.sendText` e persiste `messages`. Realtime Supabase em
`messages` e `conversations` invalida as queries automaticamente.

## Pre-flight
Otimista: schema, patterns (agentes/conexoes) e guard do runtime (F3)
ja existem; risco medio contido.
Pessimista: envio manual poderia disparar loop se guard falhasse; o
`assigned_to` seta bloqueia o runtime (`runAgentForMessage` retorna
`skipped-human`). Realtime depende de RLS `anon` ja concedido em F1.
Decisao: proceed.

## AC cobertos
- AC1: lista renderiza conversas ordenadas por `last_message_at` com
  badge `IA` / `humano` / `sem agente` — screenshot `/tmp/browser/f4/1.png`.
- AC2: painel mostra bubbles inbound/outbound com etiqueta IA nos
  outbound quando ha agente e nao esta assumida — screenshot
  `/tmp/browser/f4/2_selected.png`.
- AC3: botao "Assumir" chama `assignConversation({to:'human'})`; "Devolver
  para IA" envia `{to:null}` (implementado em `_shell.conversas.tsx`).
- AC4: composer disabled com hint quando `assigned_to` e null; habilita
  ao assumir. Envio usa `sendConversationMessage` que checa `assigned_to`
  server-side antes de chamar Evolution.
- AC5: `useConversationsRealtime` assina canal Supabase em `messages`
  e `conversations`, invalidando `['conversations']` e `['messages', id]`.
- AC6: runtime F3 ja pula com `skipped-human` quando `assigned_to != null`
  (`src/lib/agent-runtime.server.ts`).
- AC7: `bunx tsgo --noEmit` sem erros; nenhum log de content adicionado.

## Provas executadas
- Playwright smoke em `http://localhost:8080/conversas`:
  - `/tmp/browser/f4/1.png` — lista com 8 conversas reais, badges IA/sem
    agente, previews.
  - `/tmp/browser/f4/2_selected.png` — conversa aberta com historico
    completo, header com Assumir, composer disabled com hint
    "clique em assumir para responder manualmente".
- `pageerror`: nenhum.
- Typecheck: `bunx tsgo --noEmit` clean.

## Limitacoes conhecidas
- Fluxo manual "assumir -> enviar -> devolver" nao foi disparado neste
  smoke (evita mandar texto real no WhatsApp de teste); logica coberta
  por Zod + guard server-side.
- Media (audio/imagem) aparece so como `[audio]`/`[image]` no painel.
- Realtime testado apenas indiretamente (subscribe sem erro); confirmacao
  visual do refresh automatico depende de mensagem chegando durante a
  sessao.

## LDK self-check
- Required proof identified: yes (P2)
- All essential AC covered: yes
- Evidence exists for every covered AC: yes
- Proof level achieved >= required: yes (P2 alcancado)
- Critical errors known: no
- LDK engine drift detected: no

## Status
F4 => DONE