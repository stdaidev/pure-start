# F4 - Conversas/inbox + handoff - Brief

## Objetivo
Dar ao operador humano uma inbox para ver todas as conversas do WhatsApp em tempo real,
ler o historico e assumir/devolver o controle da IA sem depender do WhatsApp Web.

## Usuario
Operador interno (dono/SDR humano) que precisa intervir quando o agente IA nao resolve.

## Resultado
- Lista de conversas ordenada por `last_message_at` desc, com badge de status
  (IA / humano / fechada) e contador de nao lidas.
- Painel de mensagens da conversa selecionada com bubbles inbound/outbound
  (inclui outbound do agente marcado como IA).
- Botao "Assumir" que seta `conversations.assigned_to = <user_id|'human'>`
  (bloqueia runtime) e "Devolver para IA" que zera `assigned_to`.
- Envio manual de texto pelo operador via `EvolutionProvider.sendText`
  quando a conversa esta assumida.
- Realtime: novas mensagens aparecem sem refresh (Supabase Realtime em
  `messages`).

## Fora de escopo (fica para depois)
- Media (audio/imagem/documento) — apenas placeholder "[audio]" por enquanto.
- Templates rapidos / snippets.
- Filtros avancados (tag, agente, connection multi-select).
- Multi-usuario por workspace (segue single-user com `DEFAULT_WORKSPACE`).

## Riscos
- medio: envia texto real no WhatsApp; loop com runtime se guard falhar.
- PII em mensagens exibidas na UI — ja existe em `messages.content`, sem
  novo vetor.