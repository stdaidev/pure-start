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

## Limitacoes conhecidas
- E2E completo (curl no webhook simulando inbound do Evolution e observar linha outbound gerada) nao foi executado neste passo por depender de ambiente com `OPENAI_API_KEY` valida e chamada externa real; runtime esta implementado e defensivamente encapsulado (nunca falha o 200 do webhook).
- Grep de segredo em `dist/client/` nao executado (build gerido pelo harness). Contencao estrutural: chave lida apenas dentro do handler de `*.server.ts`.
- TTS/audio, transcricao Whisper e inbox humano ficam fora do escopo v1.

## Status
F3 => proof-pending (parcial): UI, migrations, runtime e webhook prontos; prova E2E remota depende de rodada com credenciais reais.