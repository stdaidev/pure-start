# Feature Brief - F1 Agent run ownership

Status: planned
Risk: alto
Proof required: P4
Discovery revision: 1

## Objetivo

Impedir respostas duplicadas, obsoletas ou posteriores a handoff/blocklist por meio de ownership explicito do run e
revalidacao antes de cada envio.

## Usuario

Operador da inbox e contatos atendidos pelo agente.

## Escopo

- Token unico por claim persistido na conversa.
- Release condicional ao mesmo token.
- Runtime recebe `messageId` e `runToken`.
- Revalidacao de conversa, agente, mensagem, conexao, contato e blocklist antes de enviar cada chunk.
- Testes concorrentes com provider mockado e CI.

## Fora de escopo

- Retry/backoff da OpenAI e tools resilientes, tratados em F2.
- Tabela de observabilidade, tratada em F3.
- Mudanca de UI ou novo comportamento de produto.

## Acceptance criteria

- AC1: Cada claim gera e persiste `run_token` unico.
- AC2: Release com token divergente e noop e nao libera o run vigente.
- AC3: Runtime obsoleto nao envia apos handoff, agente inativo, mensagem nova, troca de conexao/contato ou token novo.
- AC4: Numero inserido na blocklist antes do envio interrompe o run sem chamar LLM/provider.
- AC5: Dois ticks concorrentes resultam em no maximo um envio para a mesma mensagem.
- AC6: Build, lint, testes concorrentes e CI passam; diff e checklist de seguranca ficam referenciados no proof.

## Dependencias

- Baseline F8/F9/Fhot preservada em `ldk/history/v0.1/`.
- Ambiente de teste sem envio real ou provider mockado.

## Preocupacoes aplicaveis

- Concorrencia, idempotencia, envio externo, PII, rollback de migration e falso `DONE` P4.

## Pendencias [VERIFY]

- [ ] Escolher fixture local/Supabase de teste que nao use numero real.
