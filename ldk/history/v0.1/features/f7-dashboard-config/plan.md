# F7 - Dashboard + Configuracoes - Plan

## Contexto
Ver `brief.md`. Modulo fecha o shell (Dashboard hoje e placeholder;
Configuracoes so tem kill-switch + cooldown). Cadastro de secrets fecha o
AC3 pendente de F1.

## Escopo desta feature
- Rota `/dashboard` funcional (KPIs + ultimas campanhas).
- Secao "Provedores" em `/configuracoes` (Evolution, OpenAI, ElevenLabs).
- Esconder "Disparar agora" em `import.meta.env.DEV`.

## AC (Aceitacao)
- AC1: `/dashboard` renderiza 4 cards KPI (conexoes connected, campanhas
  rodando, mensagens hoje in/out, respostas hoje) com valores reais do
  workspace default.
- AC2: `/dashboard` renderiza tabela com as 5 ultimas campanhas (nome,
  status badge, sent/total, criada em) linkando para `/disparos/$id`.
- AC3: `/configuracoes` mostra 3 linhas de provedor (Evolution, OpenAI,
  ElevenLabs) com estado "configurado" (mascara ****XXXX) OU "faltando",
  botao Editar abre input, salvar persiste server-side, reload mantem.
- AC4: Nenhuma resposta de server fn contem o valor bruto do secret —
  apenas boolean `configured` e mascara curta (ultimos 4 chars).
- AC5: Evolution provider e agent-runtime leem o secret novo apos salvar
  (sem restart do server): teste manual manda mensagem apos trocar chave.
  Se depender de env var em memoria, documentar limitacao em [VERIFY].
- AC6: Em build de producao, botao "Disparar agora" nao aparece em
  `/disparos/$id`; em `import.meta.env.DEV=true`, aparece.
- AC7: `bunx tsgo --noEmit` verde. Sem log com valor de secret. Sem PII
  nova em log/analytics.

## Fora do plano
- Auth, multi-workspace, historico de secret, grafico, teste real de
  conexao (fica [VERIFY]).

## Riscos e mitigacoes
- **Vazamento de secret**: server fn de leitura devolve so mascara +
  boolean. Server fn de escrita nao devolve o valor. Nenhum
  `useLoaderData` recebe secret bruto.
- **Cache de secret em runtime**: se Evolution provider ler `process.env`
  no boot, salvar em DB pode nao ter efeito imediato. Solucao v1: provider
  passa a ler via helper `getSecret(workspace, name)` server-side a cada
  chamada; ou aceitar limitacao "aplica no proximo tick/deploy" e marcar
  em [VERIFY].
- **Dashboard lento**: 4 counts + 5 rows. Cada count agregado em uma
  query; se somar >200ms, aceitar; se >1s, criar view materializada
  (fora do escopo v1).

## Tasks

| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration: tabela `workspace_secrets(workspace_id, name, value_encrypted, updated_at)` com unique(workspace_id,name); GRANT so service_role (nunca `anon`/`authenticated` no Data API); RLS enable + policy nenhuma para anon | AC3, AC4 | `supabase/migrations/*.sql` | supabase linter + tsgo | ready |
| T2 | Server fn `listProviderSecrets` (retorna `[{name, configured, masked}]`) e `upsertProviderSecret({name, value})` em `src/lib/secrets.functions.ts`; leitura/escrita via `supabaseAdmin` dentro do handler; nunca retorna valor bruto | AC3, AC4 | `src/lib/secrets.functions.ts`, `src/lib/secrets.server.ts` (helper `getSecret`) | tsgo + curl manual | ready |
| T3 | Refatorar `evolution.server.ts` e `openai.server.ts` (e ElevenLabs se ja existir) para preferir `getSecret(workspace, name)` com fallback para `process.env`; documentar comportamento em comment | AC5 | `src/providers/channel/evolution.server.ts`, `src/providers/llm/openai.server.ts` | teste manual apos trocar chave | ready |
| T4 | UI secao "Provedores" em `/configuracoes`: lista 3 linhas com badge configurado/faltando, mascara, botao Editar (input + Salvar/Cancelar) | AC3, AC4 | `src/routes/_shell.configuracoes.tsx`, `src/components/configuracoes/provider-secrets.tsx` | preview manual | ready |
| T5 | Server fn `getDashboardSummary` em `src/lib/dashboard.functions.ts`: retorna `{connections_connected, campaigns_running, messages_today: {in,out}, replies_today, last_campaigns[5]}` | AC1, AC2 | `src/lib/dashboard.functions.ts` | tsgo + curl | ready |
| T6 | Rota `/dashboard` real: substitui Placeholder por grid de KPI cards + tabela de ultimas campanhas linkando `/disparos/$id`; polling 15s via useQuery | AC1, AC2 | `src/routes/_shell.dashboard.tsx`, `src/components/dashboard/kpi-card.tsx` | preview manual | ready |
| T7 | Esconder botao "Disparar agora" em `/disparos/$id` atras de `import.meta.env.DEV` | AC6 | `src/routes/_shell.disparos.$id.tsx` | preview manual (dev e build) | ready |
| T8 | Prova P2: fluxo manual — cadastrar cada secret, mascara aparece, reload mantem; criar/enviar 1 campanha e ver dashboard atualizar; verificar botao "Disparar agora" some em preview de producao. Checklist de seguranca (nenhum log com secret) | AC1-AC7 | `ldk/features/f7-dashboard-config/proof.md` | manual + tsgo | ready |

## Prova minima
P2 conforme AC + T8. Screenshots do dashboard (com dados reais) e das 3
linhas de provedor em ambos os estados (faltando/configurado).

## Ordem de execucao sugerida
T1 -> T2 -> T3 -> T4 (Configuracoes usavel) -> T5 -> T6 (Dashboard usavel)
-> T7 -> T8 (proof).

## Efeitos colaterais esperados fora do escopo
- F1: promover a `done` no `ldk-proof` de F7, referenciando o proof de F7
  como evidencia adicional do AC3 pendente.

## Approval
Aguardando aprovacao explicita do usuario para virar `approved` e liberar
`ldk-build`/`ldk-build-task`.
