# LDK Project - Pure Start

LDK Version: 0.2.0
LDK Schema: 2
Discovery revision: 1
Autonomy mode: balanced

## Produto

- Nome: Pure Start (nome comercial ainda pode mudar).
- Objetivo: substituir automacoes fragmentadas de atendimento por IA e campanhas no WhatsApp.
- Usuario principal: operador unico do workspace na etapa atual.
- Resultado: configurar agentes, conexoes e campanhas sem codigo, com controle humano e rastreabilidade.

## Baseline atual

- Conexoes Evolution, QR/status e webhook.
- Agentes configuraveis, inbox, handoff e blocklist.
- Contatos, planilhas, campanhas, cooldown, limites e kill-switch.
- Dashboard, configuracoes de provedores, CRM leve e KPIs.
- Historico anterior: `ldk/history/v0.1/`; audit: `ldk/audit/log.md`; releases: `ldk/releases/`.

## Plataforma

- Lovable project: conectado a este repositorio.
- GitHub repo: `https://github.com/stdaidev/pure-start`.
- Stack: TanStack Start, React, TypeScript, Tailwind e shadcn/ui.
- Backend: Supabase/Postgres, server functions, rotas publicas controladas e jobs agendados.
- Dados/estado: workspace unico com contatos, conversas, mensagens, agentes, campanhas e configuracoes.
- Identidade e acesso: sem login na etapa atual; nao aprovado para exposicao publica irrestrita.
- Operacoes de alto impacto: disparo de mensagens, delecao, alteracao de secrets, handoff e automacao por IA.
- Integracoes: Evolution API, OpenAI e Supabase.

## Direcao visual persistente

- HUD premium dark-first, tokens OKLCH, acento laranja, glass cards, grid sutil e tipografia funcional.
- Sem flicker, marquee, scanline, animacao sobre letras ou movimento decorativo continuo.
- Mudancas visuais devem preservar acessibilidade, responsividade e legibilidade operacional.

## Preocupacoes aplicaveis

| Concern | Why it matters | Decision | Proof/validation |
|---------|----------------|----------|------------------|
| Auth/RLS | Policies anon alcancam dados do workspace default | Uso interno ate hardening; gate de release publico | Teste de papeis e revisao de grants/policies |
| PII/LGPD | Telefones, mensagens, notas e campanhas | Logs minimizados; retencao/exclusao ainda a definir | Checklist e testes de exclusao/exportacao |
| Concorrencia | Ticks e webhooks podem disputar o mesmo estado | Lock com ownership, claims atomicos e revalidacao | Testes concorrentes P3/P4 |
| Reputacao/abuso | Disparos afetam numero e destinatarios | Limites, cooldown, opt-out, kill-switch e stop-on-reply | Stress test controlado e prova manual |
| Provedores | Falhas e rate limits externos sao esperados | Timeout, retry limitado, backoff e erro classificado | Mocks de 429/5xx/timeout |
| Segredos | Credenciais habilitam operacoes reais | Server-only; nao logar; evoluir armazenamento antes de escala | Grep de bundle/log e revisao de grants |
| Observabilidade | Jobs assincronos precisam diagnostico | Eventos estruturados e sanitizados | Query de logs sem PII/content |
| Release | Baseline antiga nao tem CI uniforme | Novas entregas seguem proof atual e observavel | Checker + build/lint/test/CI |
| Lint herdado | 1.526 apontamentos na baseline, quase todos Prettier | Corrigir separadamente; nunca registrar lint como pass enquanto estiver vermelho | `npm run lint` |

## Decisoes persistentes

| Decisao | Escolha | Fonte |
|---------|---------|-------|
| Canal atual | Evolution API atras de ChannelProvider | Codigo e intake original |
| LLM atual | OpenAI atras de LLMProvider | Codigo e audit log |
| Modelo default | `gpt-4.1-mini` | Audit log de F3 |
| Escopo de acesso | Operacao interna de workspace unico | Discovery revision 1 |
| Auditoria LDK | on; `ldk/audit/log.md` | Configuracao anterior preservada |
| Estado anterior | Snapshot somente leitura em `ldk/history/v0.1/` | Migracao schema 2 |

## Auditoria LDK

- Audit log: on
- Audit log file: `ldk/audit/log.md`

## Pendencias [VERIFY]

- [ ] Auth e policies por usuario antes de release publico.
- [ ] Retencao/exclusao/exportacao de PII.
- [ ] Credencial server-only dedicada para agent/dispatch ticks.
- [ ] Test runner, CI e smoke browser para P3/P4.
- [ ] Corrigir o lint herdado em commit mecanico separado.
