# F5 - Contatos e Planilhas - Plan

## Feature
F5 - Contatos e Planilhas (upload CSV/XLSX, headers -> placeholders, opt-out)

## Risk
medio

## Proof required
P2

## Cerimonia
medio - plano completo, `ldk-build` autorizado.

## Modo de execucao recomendado
`ldk-build` (sem segredo novo, sem migracao destrutiva; unica decisao aberta e a lib de parse XLSX - resolvida abaixo).

## Decisoes tomadas
- Parser: `papaparse` para CSV e `xlsx` (SheetJS) para XLSX. Parse no **client**, para nao subir PII crua ao Worker; server recebe linhas ja mapeadas.
- Normalizacao de telefone: strip nao-digitos; se 10-11 digitos assume Brasil e prefixa `55`.
- Upsert por `(workspace_id, phone)`. Colisao preserva `opt_out=true` existente.
- Placeholders: colunas nao mapeadas viram entradas em `contacts.metadata` (jsonb) com header em snake_case.

## Acceptance criteria
- AC1: `/contatos` lista contatos (paginado 100), busca por nome/telefone, toggle `opt_out`, edicao inline de `name` e `tags`. Botao "Importar planilha".
- AC2: `/planilhas` passo 1 - upload `.csv`/`.xlsx`; mostra amostra das 5 primeiras linhas.
- AC3: passo 2 - mapear cada coluna para `name` | `phone` | `email` | `tags` | `placeholder` | `ignorar`. Telefone obrigatorio.
- AC4: passo 3 - preview com contagem (novos/atualizados/opt-outs preservados/invalidos) e botao Confirmar.
- AC5: server function `importContacts` faz upsert em batches de 200, normaliza telefone, mescla metadata, respeita opt_out existente. Retorna resumo.
- AC6: server functions `listContacts(query, limit, offset)`, `updateContact({id, name?, tags?, opt_out?})`, `deleteContact({id})` com Zod.
- AC7: nenhum log expoe telefone/email/nome.
- AC8: `tsgo` verde; `/contatos` e `/planilhas` sem `pageerror`.

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Instalar `papaparse` + `xlsx` + `@types/papaparse`. | AC2 | package.json | `bun add` ok. | done |
| T2 | Utils client: `parseCsv(File)` e `parseXlsx(File)` -> `{headers, rows}`; `normalizePhone(raw)`. | AC2, AC3, AC5 | `src/lib/contacts-parse.ts`, `src/lib/phone.ts` | Playwright: upload CSV mock renderiza sample. | done |
| T3 | Server functions `listContacts`, `updateContact`, `deleteContact`, `importContacts` com Zod, upsert em batch, merge metadata, opt-out preservado. | AC1, AC5, AC6, AC7 | `src/lib/contacts.functions.ts` | `tsgo` verde. | done |
| T4 | UI `/contatos`: tabela HUD (nome, telefone, tags, opt-out, atualizado), busca, edicao via dialog, delete com confirm. Link "Importar planilha". | AC1 | `src/routes/_shell.contatos.tsx`, `src/components/contatos/*` | Playwright screenshot. | done |
| T5 | UI `/planilhas`: wizard 3 passos (upload -> mapping -> preview) com estado local. Pre-detecta `phone`/`telefone`/`nome`/`email`. | AC2, AC3, AC4 | `src/routes/_shell.planilhas.tsx`, `src/components/planilhas/*` | Playwright screenshot dos 3 passos com CSV mock. | done |
| T6 | Import: passo 3 chama `importContacts`, mostra toast com resumo, redireciona para `/contatos`. | AC4, AC5 | edit `src/routes/_shell.planilhas.tsx` | Playwright: importa CSV mock, ve linhas em `/contatos`. | done |
| T7 | Prova P2: Playwright smoke completo + proof.md. | AC1-AC8 | `ldk/features/f5-contatos-planilhas/proof.md` | Ver proof.md. | done |

## Arquivos criados/alterados (esperados)
- src/lib/contacts.functions.ts (novo)
- src/lib/contacts-parse.ts (novo)
- src/lib/phone.ts (novo)
- src/routes/_shell.contatos.tsx (substituir placeholder)
- src/routes/_shell.planilhas.tsx (substituir placeholder)
- src/components/contatos/* (novo)
- src/components/planilhas/* (novo)
- package.json (`bun add papaparse xlsx @types/papaparse`)
- ldk/features/f5-contatos-planilhas/proof.md (no build)

## Fora de escopo
- Segmentos nomeados, tags avancadas, historico auditavel de import.
- Enrichment/validacao externa.
- Sync com CRM externo.

## Roadmap/dependencias
- Depende do schema `contacts` (F1) - ja existe.
- Desbloqueia F6 (Disparos).
