# Operacao do Pure Start

## Requisitos de runtime

- Node.js 22.12 ou superior.
- Supabase com todas as migrations de `supabase/migrations/` aplicadas em ordem.
- URL publica HTTPS estavel para receber webhooks e ticks.

## Variaveis server-only

| Variavel                    | Uso                                                                                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Projeto Supabase.                                                                                                                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Acesso administrativo somente no servidor.                                                                                                                                               |
| `SUPABASE_PUBLISHABLE_KEY`  | Cliente Supabase. Nao autoriza workers.                                                                                                                                                  |
| `WEBHOOK_VERIFY_TOKEN`      | Assina chamadas recebidas da Evolution.                                                                                                                                                  |
| `INTERNAL_TICK_TOKEN`       | Autoriza `/api/public/agent/tick` e `/api/public/dispatch/tick`. A migration gera um valor aleatorio em `workspace_secrets`; ambiente e `WEBHOOK_VERIFY_TOKEN` permanecem como fallback. |
| `PUBLIC_APP_URL`            | Origem publica usada para montar o webhook da Evolution. `APP_URL` tambem e aceito como fallback.                                                                                        |

As credenciais de Evolution e OpenAI podem vir do ambiente ou da tela de configuracoes. Nunca use uma chave
publicavel/anon como segredo de worker.

## Atualizacao dos jobs

Ao aplicar `20260710214500_internal_tick_jobs.sql`, os jobs `pg_cron`/`pg_net` anteriores sao substituidos e passam a
ler o token interno no banco sem expor o valor no SQL agendado. Em uma instalacao externa, o header equivalente e:

```text
Authorization: Bearer <INTERNAL_TICK_TOKEN>
```

ou:

```text
x-internal-token: <INTERNAL_TICK_TOKEN>
```

Uma instalacao antiga que ainda envia `SUPABASE_PUBLISHABLE_KEY` recebera `401`. Se nenhum segredo interno estiver
configurado, o endpoint retorna `503` e nao executa trabalho.

## Ordem segura de deploy

1. Configure `WEBHOOK_VERIFY_TOKEN`, `INTERNAL_TICK_TOKEN` e a URL publica no ambiente.
2. Aplique as migrations.
3. Publique a aplicacao.
4. Confirme que os jobs foram recriados pela migration e usam `x-internal-token`.
5. Confirme um tick sem trabalho e um webhook de status sem PII nos logs.
6. So entao habilite agente ou campanha real.

## Gate de exposicao publica

O produto opera hoje como workspace unico e ainda nao possui fluxo de login. As server functions administrativas
usam acesso privilegiado no servidor. Mantenha a aplicacao atras de controle de acesso da plataforma/rede ate que
autenticacao, autorizacao por workspace e RLS por usuario sejam implementadas e testadas. Isso inclui especialmente
alteracao de secrets, disparos, exclusoes e kill-switch.
