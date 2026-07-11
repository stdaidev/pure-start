# Feature Brief - F2 OpenAI and tool resilience

Status: planned
Risk: medio
Proof required: P2
Discovery revision: 1

## Objetivo

Impedir que args invalidos de tools ou falhas esperadas da OpenAI derrubem o runtime sem classificacao ou controle.

## Usuario

Operador que depende de degradacao previsivel do agente.

## Escopo

- Parse seguro das tools e retorno generico de falha.
- Limite de falhas por run.
- Erro OpenAI tipado com retryability.
- Retry/backoff limitado para timeout, 429 e 5xx.
- Modelo default coerente com o provider atual.

## Fora de escopo

- Provider dinamico, requeue persistente e memoria de conversa.

## Acceptance criteria

- AC1: Args invalidos nao propagam ZodError nem conteudo sensivel.
- AC2: Falha de tool produz retorno generico e respeita limite por run.
- AC3: Timeout/429/5xx recebem retry limitado; 400/401/403 nao recebem retry.
- AC4: Erros expõem `code`, `status` e `retryable` sem prompt/body.
- AC5: Modelo default e `gpt-4.1-mini` e nao restam defaults incompatíveis.
- AC6: Fluxos de tool invalida e 429 mockado passam com evidência observavel.

## Dependencias

- F1 done.

## Preocupacoes aplicaveis

- Falha externa, rate limit, timeout, PII em erro/log e custo de retry.

## Pendencias [VERIFY]

- [ ] Confirmar tempos de backoff com o limite operacional esperado.
