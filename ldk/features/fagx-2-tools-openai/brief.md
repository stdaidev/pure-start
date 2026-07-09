# Fagx-2 - Tools resilientes + erros OpenAI classificados + model default

## Objetivo
Impedir que uma tool com args invalidos ou uma falha da OpenAI derrube o
runtime inteiro. Classificar erros da OpenAI com `code`/`status`/
`retryable` sem vazar prompt/mensagens. Alinhar `agents.model` default
ao provider OpenAI (hardcoded hoje).

## Usuario
Operador. Runtime degrada com elegancia: LLM recebe feedback "tool
falhou" e pode continuar; 429/5xx nao viram falha silenciosa; agente
novo nasce com model compativel.

## Escopo v1
- `registry.server.ts`: `.safeParse()` nas tools; handlers nao lancam
  ZodError para fora.
- Runtime: wrap try/catch por tool_call; falha => `role:"tool"` com
  texto generico; cap `MAX_TOOL_FAILURES = 2`; novo status
  `skipped-tool-error`.
- `openai.server.ts`: `OpenAIError { code, status?, retryable }` com
  codes `openai_timeout`, `openai_rate_limited`, `openai_bad_request`,
  `openai_server_error`, `openai_unknown`. Retry backoff (max 2) para
  429/5xx/timeout. Sem log de body/prompt.
- Migration: default `agents.model = 'gpt-4.1-mini'` + backfill dos
  `google/gemini-2.5-flash`.
- UI: "Padrao do sistema: 2 iteracoes"; max_tokens default 800.

## Fora de escopo
- Provider dinamico (`agents.provider`).
- Requeue com contador persistente.
- F13 memoria/resumo.

## Prova minima
P2: (1) tool com args invalidos nao derruba runtime; (2) mock 429 =>
`openai_rate_limited` + retry; (3) `SELECT model FROM agents WHERE model
LIKE 'google/%'` = 0; (4) screenshot UI.

## Dependencias
- Fagx-1 done (`RunAgentResult` expandido).