# F2 Evidence - 2026-07-10

Status: PARTIAL

## Implementacao observada

- Tools usam `safeParse`, resposta generica e circuit breaker de falhas no runtime.
- OpenAI usa timeout, erro estruturado e no maximo dois retries para timeout/rede/429/5xx.
- 400/401/403 nao recebem retry e o corpo da resposta nao entra em erro/log.
- `max_tool_rounds = null` respeita o significado auditado de ilimitado com hard cap 20.
- Default/backfill do modelo foi alinhado para `gpt-4.1-mini` na migration nova.

## Evidencia local

- Teste mockado comprova duas respostas 429 seguidas de sucesso e backoffs 200/500 ms.
- Teste mockado comprova que 400 faz uma chamada e nao expoe o corpo.
- Teste de tool invalida comprova retorno generico antes de I/O.
- Typecheck, lint e build passam localmente.

## Lacuna

O backfill/default e a integracao completa do runtime dependem da migration aplicada e de staging. Consolidar proof
P2 depois do CI e da verificacao da query do modelo.
