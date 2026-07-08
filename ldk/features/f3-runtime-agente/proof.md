# F3 - Runtime do agente + modulo Agentes - Proof

## Resumo
Runtime server-only responde no WhatsApp via OpenAI, com humanizacao
(chunk + delay), tools `resetar`/`transferir_humano`, guard de humano/
outbound-loop e comando textual `/resetar`. UI `/agentes` faz CRUD
completo; UI `/conexoes` vincula agente default e alterna `ignore_groups`.

## AC cobertos
- AC1: `LLMProvider` + `OpenAIProvider` server-only (`src/providers/llm/openai.server.ts`), sem chave no bundle.
- AC2: migration `agents.tools`/`agents.humanization`/`connections.default_agent_id`/`conversation_markers` aplicada; migration `connections.ignore_groups` adicionada. Linter Supabase limpo.
- AC3: server functions `list/get/save/delete/toggleAgent` + UI `/agentes` com dialog CRUD.
- AC4: `connections.default_agent_id` visivel na UI; `setConnectionAgent` persiste.
- AC5: webhook Evolution chama `runAgentForMessage` apos insert de inbound text (Promise.race, cap 12s).
- AC6: runtime pula quando `assigned_to != null` ou `agent.active=false`; ignora `direction=outbound`.
- AC7: tool `transferir_humano` seta `conversations.assigned_to='human'` e para o loop.
- AC8: comando `/resetar` insere `conversation_markers(kind=reset)`; historico so considera mensagens apos ultimo marker.
- AC9: humanizacao chunk+sleep configuravel (min/max ms) com cap total 12s.
- AC10: `OPENAI_API_KEY` lido dentro do handler de `openai.server.ts` (nunca import estatico em .functions.ts). Nenhum log inclui `content`.

## Provas executadas
- Supabase linter: `No linter issues found`.
- Playwright smoke: `/agentes` e `/conexoes` renderizam sem pageerror; screenshots em `/tmp/browser/f3/`.
- Codigo revisado: `runAgentForMessage` guards + humanizacao + tool loop; webhook filtra `@g.us` por `connections.ignore_groups`.
- E2E manual real (P2) executado pelo usuario com duas conexoes Evolution (cliente + vendedor/SDR):
  - Inbound do cliente entrega no webhook publicado, runtime responde via OpenAI e envia pelo vendedor.
  - Correcao aplicada em `src/routes/api/public/evolution.webhook.ts`: idempotencia escopada por `conversation_id`
    (antes deduplicava globalmente por `workspace_id`+`external_id`, o que descartava a segunda mensagem quando
    cliente e vendedor compartilhavam o mesmo `providerMessageId`).
  - Presenca "digitando" adicionada em `evolutionProvider.sendTyping` + chamada por chunk em
    `runAgentForMessage`.
  - URL de webhook fixada em `https://light-springboard.lovable.app` (Evolution nao entrega em preview).

## Limitacoes conhecidas
- Teste E2E automatizado (curl script + assert em `messages`) nao foi escrito; validacao atual e manual do usuario.
- CI verde + grep de segredo em `dist/client/` nao executados no harness. Contencao estrutural: chave lida apenas
  dentro do handler de `*.server.ts`.
- TTS/audio, transcricao Whisper e inbox humano ficam fora do escopo v1.

## Status
F3 => PARTIAL: runtime funcional e validado manualmente pelo usuario (P2). Prova P4 (teste automatizado + CI + diff
GitHub verificado) fica pendente; nao bloqueia F4 porque o fluxo end-to-end ja responde no WhatsApp real.