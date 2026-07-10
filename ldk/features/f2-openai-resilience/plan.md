# Feature Plan - F2 OpenAI and tool resilience

Status: planned
Risk: medio
Proof required: P2
Discovery revision: 1
Optional tasks: none

## Brief

`ldk/features/f2-openai-resilience/brief.md`

## Abordagem

Padronizar falhas na borda de cada tool/provider, limitar repeticao e provar o comportamento com mocks sem expor
conteudo real.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Usar parse seguro e retorno padronizado em cada tool. | AC1 | `src/providers/tools/registry.server.ts` | teste com args invalidos | backlog |
| T2 | Tratar falha por tool call e limitar falhas do run. | AC2 | `src/lib/agent-runtime.server.ts` | cenario mockado | backlog |
| T3 | Criar erro OpenAI tipado e retry/backoff limitado. | AC3, AC4 | `src/providers/llm/openai.server.ts` | mocks timeout/429/500/400 | backlog |
| T4 | Alinhar default/backfill do modelo e copy da UI. | AC5 | migration, `src/components/agentes/agent-dialog.tsx` | query + observacao UI | backlog |
| T5 | Consolidar proof P2 e checar logs sensiveis. | AC1-AC6 | `ldk/features/f2-openai-resilience/proof.md` | fluxo mockado + grep | backlog |

## Estrategia de prova

- P1: observacao da copy/default da UI.
- P2: fluxos mockados de tool invalida, 429 e erro nao-retryable com resultado esperado.
- P3: nao exigido, mas testes automatizados podem elevar confianca.
- P4: nao exigido nesta feature; release pode elevar o gate pelo conjunto.

## Evidencia durante execucao

- Consolidar no proof ou usar `evidence.md` se houver varias rodadas.

## Riscos e rollback

- Risco: retry excessivo, custo, latencia ou mascaramento de erro permanente.
- Mitigacao: allowlist de retry, limite baixo e codigo estruturado.
- Rollback: manter caminho sem retry atras de configuracao reversivel durante validacao.
