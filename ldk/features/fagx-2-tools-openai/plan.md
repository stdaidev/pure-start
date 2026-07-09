# Fagx-2 - Plan

## Feature
Fagx-2 - Tools resilientes + erros OpenAI classificados + model default

## Risk
medio

## Proof required
P2

## Modo de execucao recomendado
`ldk-build`.

## Acceptance criteria
- AC1: Nenhuma tool em `registry.server.ts` lanca ZodError para fora.
- AC2: Runtime captura falha de tool, insere `role:"tool"` com texto
  generico, sem PII, e permite proxima iteracao do LLM.
- AC3: Apos `MAX_TOOL_FAILURES` falhas => `skipped-tool-error`, sem envio.
- AC4: `openai.server.ts` exporta erro tipado com `code`, `status?`,
  `retryable`. Nenhum log inclui `messages`/`prompt`/body.
- AC5: 429/5xx/timeout => retry com backoff (max 2). 400/401/403 => sem
  retry, `retryable=false`.
- AC6: Migration altera default de `agents.model` para `gpt-4.1-mini` e
  backfill dos rows com `google/gemini-2.5-flash`. Linter limpo.
- AC7: UI mostra "Padrao do sistema: 2 iteracoes"; max_tokens default 800.
- AC8: `tsgo --noEmit` verde; `npm run build` verde.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | `registry.server.ts`: `.safeParse` em cada tool + retorno padronizado. | AC1 | `src/providers/tools/registry.server.ts` | `tsgo`; diff. | ready |
| T2 | Runtime: try/catch por tool_call, contador de falhas, status `skipped-tool-error`. | AC2, AC3 | `src/lib/agent-runtime.server.ts` | Manual: forcar tool ruim. | ready |
| T3 | `openai.server.ts`: `OpenAIError` + backoff simples (200ms/500ms). | AC4, AC5 | `src/providers/llm/openai.server.ts` | Mock `fetch` 429 => 2 tentativas. | ready |
| T4 | Grep de log: nenhum `console.*` serializa `messages`/`content`/prompt. | AC4 | runtime + openai | `rg 'console\\.' src/lib/agent-runtime.server.ts src/providers/llm/openai.server.ts`. | ready |
| T5 | Migration: `ALTER agents ALTER model SET DEFAULT 'gpt-4.1-mini'` + `UPDATE ... WHERE model='google/gemini-2.5-flash'`. | AC6 | migration Supabase | Linter; `SELECT count(*) WHERE model LIKE 'google/%'` = 0. | ready |
| T6 | UI copy + default max_tokens. | AC7 | `src/components/agentes/agent-dialog.tsx` | Screenshot Playwright. | ready |
| T7 | Proof `ldk/features/fagx-2-tools-openai/proof.md`. | AC1-AC8 | proof.md | Manual. | ready |

## Arquivos criados/alterados (esperados)
- `src/providers/tools/registry.server.ts`
- `src/lib/agent-runtime.server.ts`
- `src/providers/llm/openai.server.ts`
- migration Supabase
- `src/components/agentes/agent-dialog.tsx`
- `ldk/features/fagx-2-tools-openai/proof.md`

## Fora de escopo
- Provider dinamico.
- Requeue persistente.

## Roadmap/dependencias
- Depende de Fagx-1 done.

## Status no ledger
idea -> planned.