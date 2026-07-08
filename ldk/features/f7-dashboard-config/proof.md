# F7 - Dashboard + Configuracoes - Proof (P2)

## Data
2026-07-08 (build direto via `ldk-build`, sem checkpoints intermediarios).

## Escopo executado
- T1: migration `workspace_secrets` (workspace_id, name, value, updated_at) com
  unique(workspace_id, name). GRANT so `service_role`, RLS enable, sem policies
  para anon/authenticated — Data API nao le/escreve.
- T2: `src/lib/secrets.functions.ts` com `listProviderSecrets`,
  `upsertProviderSecret`, `deleteProviderSecret` — nunca retornam valor bruto,
  apenas `{name, configured, masked, source, updated_at}`.
- T3: `evolution.server.ts` e `openai.server.ts` refatorados para chamar
  `getSecret()` (DB -> env fallback, cache 30s). Nenhuma mudanca no contrato
  publico dos providers.
- T4: `src/components/configuracoes/provider-secrets.tsx` + secao adicionada
  em `/configuracoes` com 4 linhas (URL base, API key Evolution, OpenAI,
  ElevenLabs). Badge `configurado/env/faltando`, mascara ****XXXX, botoes
  Configurar/Trocar/Salvar/Cancelar.
- T5: `src/lib/dashboard.functions.ts` -> `getDashboardSummary` retorna
  KPIs + ultimas 5 campanhas com sent/total.
- T6: `/dashboard` substitui Placeholder por 4 KPI cards + tabela de ultimas
  campanhas linkando para `/disparos/$id`, polling 15s.
- T7: botao "Disparar agora" em `/disparos/$id` envolvido em
  `import.meta.env.DEV` — some em build de producao.

## AC cobertos
- AC1: dashboard.png mostra os 4 KPI cards com valores reais
  (conexoes ativas=2, campanhas rodando=0, msgs hoje 0/0, respostas 0).
- AC2: dashboard.png lista 2 campanhas (teste6, teste5) com badge finalizada
  e sent/total 0/2, 1/2. Link para /disparos/$id funciona (Link tipado).
- AC3: config.png mostra Provedores com 3 linhas configuradas via env
  (Evolution URL, Evolution API key, OpenAI) e ElevenLabs "faltando" com
  botao Configurar. Fluxo Trocar/Salvar mutation valida.
- AC4: server fns em `secrets.functions.ts` NUNCA retornam `value` — apenas
  `masked` (ultimos 4 chars) e `configured`. Verificado no source. `env`
  fallback aparece como `****env` (mascara opaca).
- AC5: `getSecret` prefere DB e faz fallback em `process.env`. Cache TTL
  30s -> alteracao aplica no proximo ciclo sem restart. Providers Evolution
  e OpenAI agora consultam via helper.
  [VERIFY] teste de envio real ponta-a-ponta apos trocar chave nao foi
  executado nesta sessao — validar em campo antes de trocar chaves.
- AC6: `import.meta.env.DEV` esta true em dev/preview (botao visivel em
  disparos.$id), false em `bun run build` de producao (botao desaparece).
  Verificacao manual no build de producao pendente.
  [VERIFY] confirmar em preview publicado.
- AC7: `bunx tsgo --noEmit` verde. Nenhum log de valor bruto (grep no source
  nao encontrou `console.*value`). Nenhuma PII nova.

## Evidencia
- ldk/features/f7-dashboard-config/dashboard.png
- ldk/features/f7-dashboard-config/config.png
- tsgo: exit 0 sem output.

## Veredito otimista
- Modulo pronto: shell 100% funcional, dashboard operacional, secrets
  gerenciaveis por UI. Fecha F1 AC3 (secrets sem env manual).
- Providers passaram a ler via helper sem mudar contrato -> zero regressao
  esperada em F3/F6.
- Botao "Disparar agora" some em producao — remove risco documentado no
  release v2.

## Veredito pessimista
- Cache 30s + fallback env: se usuario salvar chave nova e testar em <30s,
  pode ver a antiga; comportamento documentado.
- v1 armazena secret em texto plano no DB (protegido por service_role +
  RLS sem policy). Encryption-at-rest com KMS fica para v2.
- AC5 (envio real apos troca de chave) e AC6 (botao some em prod build)
  nao foram testados ponta-a-ponta — marcados [VERIFY].
- Ainda nao ha auth: qualquer visitante da URL de preview vê o dashboard
  e as secrets mascaradas. Consistente com o backlog geral (F1 v2).

## Status
DONE (P2) com [VERIFY] em AC5 e AC6.

## Efeito colateral
- F1 promovida a `done` no ledger: secrets agora tem UI e helper
  server-side; env vars continuam como fallback. Evidencia adicional: este
  proof + `src/lib/secrets.server.ts`.

## Etapa concluida — aguardando proximo comando.