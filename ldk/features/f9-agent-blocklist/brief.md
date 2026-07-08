# F9 - Blocklist de numeros do agente

## Objetivo
Permitir cadastrar telefones que o agente de IA deve ignorar (amigos,
funcionarios). Mensagens desses numeros continuam entrando na inbox e
em `messages`, mas o webhook nao agenda `schedule_agent_run`.

## Risco
baixo

## Escopo v1
- Tabela `agent_ignored_numbers` (workspace_id, phone_e164, label).
- CRUD via server fns (`src/lib/agent-ignored.functions.ts`).
- UI em `/agentes` (card no rodape) com telefone + rotulo + lista.
- Guard no webhook antes de agendar run do agente.

## Prova minima
P2 manual: cadastrar numero, enviar mensagem, ver na inbox e nenhuma resposta.

## Dependencias
F3 done, F8 (fluxo de schedule_agent_run).
