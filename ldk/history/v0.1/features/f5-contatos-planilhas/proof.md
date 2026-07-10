# F5 - Contatos e Planilhas - Proof

## Resumo
`/contatos` lista/busca/edita/deleta contatos e alterna opt-out. `/planilhas`
entrega wizard de 3 passos (upload -> mapping -> preview) com parse client-side
(papaparse/xlsx). `importContacts` faz upsert em batch por
`(workspace_id, phone)`, mescla metadata e tags e preserva opt-out existente.

## Pre-flight
Otimista: schema `contacts` ja existe (F1) com UNIQUE em `(workspace_id, phone)`,
parse fica no navegador (sem PII crua para o Worker), sem novos segredos.
Pessimista: XLSX no client aumenta bundle; risco de reverter opt-out se merge
errar — mitigado buscando existente antes do upsert e forcando `opt_out = prev`.
Decisao: proceed.

## AC cobertos
- AC1: `/contatos` lista paginada (100), busca por nome/telefone (`.or ilike`),
  toggle opt-out via `Switch`, edicao via `ContactEditDialog`, delete com confirm.
  Screenshot `/tmp/browser/f5/screenshots/1_contatos.png` e `5_contatos_after.png`.
- AC2: `/planilhas` passo 1 recebe `.csv/.xlsx`, chama `parseSheet` no client.
  Screenshot `2_planilhas_upload.png`.
- AC3: passo 2 usa `MappingTable` com Select por coluna (`name|phone|email|tags|placeholder|ignorar`).
  Botao Continuar so habilita quando `phone` esta mapeado.
  Screenshot `3_planilhas_map.png`.
- AC4: passo 3 mostra contagem (validos/invalidos/lidas/mapeadas) e amostra 10 linhas.
  Screenshot `4_planilhas_preview.png`.
- AC5: `importContacts` (server) dedupa por phone, busca existentes,
  mescla `metadata`/`tags`, mantem `opt_out` prev, upsert em batches de 200
  com `onConflict: workspace_id,phone`.
- AC6: `listContacts`, `updateContact`, `deleteContact` com Zod e workspace-scope.
- AC7: Nenhum log expoe telefone/email/nome (handlers so lancam mensagem generica).
- AC8: `bunx tsgo --noEmit` verde. Playwright sem `pageerror` (apenas warning
  de hydration de `data-tsd-source` do template, nao relacionado).

## Provas executadas
- CSV mock `/tmp/browser/f5/mock.csv` (3 linhas, 1 sem telefone).
- Playwright smoke `/tmp/browser/f5/run.py`:
  1. `/contatos` renderiza vazio inicialmente.
  2. `/planilhas` upload -> wizard vai para passo 2/3.
  3. Continuar -> passo 3/3 mostra `2 validos, 1 invalido, 3 linhas lidas`.
  4. Confirmar -> toast "2 novos, 0 atualizados, 0 opt-outs preservados",
     redireciona para `/contatos` e Alice/Bob aparecem com telefones normalizados
     (`5511987654321`, `5521998765432`) e tag `vip`/`cliente`.
- Typecheck: `bunx tsgo --noEmit` clean.

## Limitacoes conhecidas
- Bundle inclui `xlsx` (SheetJS) — impacto no client (lazy import fica para depois).
- Merge de tags e union (sem remover); remocao explicita fica para F6.
- Nao valida email (aceita string livre).
- Busca cobre nome/telefone; nao busca por metadata/tag ainda.

## LDK self-check
- Required proof identified: yes (P2)
- All essential AC covered: yes
- Evidence exists for every covered AC: yes
- Proof level achieved >= required: yes (P2)
- Critical errors known: no
- LDK engine drift detected: no

## Status
F5 => DONE