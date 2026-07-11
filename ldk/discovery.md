# LDK Project Discovery

LDK Version: 0.2.0
LDK Schema: 2
Status: approved
Revision: 1
Approved at: 2026-07-10
Approved by: project owner; reconstructed from the original intake audit and confirmed by the schema migration request

## Finalidade

- O que sera criado: uma operacao web para atendimento por agente de IA e disparos controlados no WhatsApp.
- Por que sera criado: substituir automacoes fragmentadas e permitir que um operador configure agentes, conexoes,
  contatos, campanhas e acompanhamento sem editar fluxos ou codigo.
- Problema atual: o produto ja esta em desenvolvimento; o proximo ciclo precisa endurecer concorrencia,
  confiabilidade e observabilidade sem perder o estado funcional existente.

## Usuarios e atores

- Usuario principal: operador unico do workspace na etapa atual.
- Outros atores: contatos atendidos, provedores de canal e LLM, Supabase, jobs agendados e futuro operador autenticado.

## Resultado e sucesso

- Resultado esperado: atendimento e campanhas operarem com controle humano, protecao contra duplicidade/abuso e
  rastreabilidade suficiente para diagnosticar falhas.
- Sucesso funcional: conexao ativa, mensagens recebidas, agente respeitando handoff/blocklist, campanhas respeitando
  limites e operador conseguindo acompanhar o estado.
- Sucesso operacional: jobs idempotentes, locks atomicos, falhas classificadas, nenhuma credencial/PII exposta e
  proof proporcional antes de release.

## Jornada principal

1. O operador configura credenciais, conexoes e agentes.
2. Mensagens recebidas entram na inbox e podem acionar o agente ou handoff humano.
3. O operador importa contatos/planilhas, prepara uma campanha e define limites.
4. Jobs processam atendimento e disparos com locks, retries, timeouts e stop conditions.
5. O operador acompanha conversas, campanhas, pipeline e sinais operacionais.

## Escopo inicial

### Essencial

- Preservar a baseline funcional ja implementada.
- Fechar ownership/revalidacao dos runs do agente.
- Tornar tools e falhas do LLM resilientes.
- Adicionar observabilidade estruturada sem conteudo sensivel.
- Provar atomicidade dos limites globais de disparo.
- Preparar prova reproduzivel do runtime antes de um release publico.

### Fora de escopo agora

- Pagamentos.
- Aquisição, SEO, pixel ou analytics de marketing.
- API oficial do WhatsApp.
- Multi-workspace real, RBAC completo e memoria vetorial.

## Concern Scan

| Concern | Status | Trigger | Decision | Proof or validation |
|---------|--------|---------|----------|---------------------|
| Identidade e autorizacao | applicable | App trata PII e hoje opera sem login | Uso restrito/interno; auth e policies por usuario bloqueiam exposicao publica | Revisao RLS e teste de papeis antes de release publico |
| Privacidade e retencao | applicable | Telefones, mensagens, notas e dados de campanha | Minimizar logs; definir retencao/exportacao/exclusao antes de escala | Checklist LGPD + consultas de retencao/exclusao |
| Jobs, locks e concorrencia | applicable | Webhook, agent tick, dispatch tick e pg_cron | Claims atomicos, ownership por token e idempotencia | Testes concorrentes reproduziveis |
| Falhas externas | applicable | Evolution, OpenAI e Supabase | Timeouts, retry limitado, backoff, erros classificados e circuit breaker | Mocks + cenarios de falha |
| Limites e abuso | applicable | Disparo em massa e reputacao do numero | Limites por campanha/conexao, cooldown, opt-out, kill-switch e stop-on-reply | Stress test controlado + observacao operacional |
| Segredos | applicable | Credenciais de canal e LLM | Somente server-side; criptografia/secret manager antes de ampliar acesso | Grep de bundle/log + revisao de grants |
| Observabilidade | applicable | Runs assincronos e falhas hoje dificeis de correlacionar | Log estruturado sem prompt, mensagem, telefone ou args sensiveis | Queries e amostras sanitizadas |
| Release e prova | applicable | Features de alto risco sem suite/CI consistente | P3/P4 exigem comando reproduzivel, CI e referencias atuais | Workflow verde + diff/commit |
| Qualidade herdada | applicable | Build passa, mas lint da baseline tem 1.526 apontamentos, majoritariamente Prettier | Nao mascarar nem misturar formatacao massiva nesta migracao; sanear antes de usar lint como prova | `npm run build` pass; `npm run lint` fail registrado |
| Acessibilidade e performance | later | Interface operacional ja funcional | Medir e tratar por jornada, sem bloquear hardening atual | Auditoria direcionada quando UI mudar |
| Aquisicao e SEO | not-applicable | Produto atual e uma ferramenta operacional | Nao adicionar rastreamento de marketing sem nova finalidade | Reabrir discovery se surgir superficie publica |
| Pagamentos | not-applicable | Fora do produto atual | Nenhuma integracao financeira | Reabrir discovery se o escopo mudar |

## Restricoes e decisoes conhecidas

- Stack atual: TanStack Start, React, TypeScript, Supabase e provedores encapsulados.
- Evolution API permanece como canal atual, atras do contrato ChannelProvider.
- OpenAI permanece como LLM atual, atras do contrato LLMProvider.
- O workspace unico e uma restricao consciente da etapa atual, nao uma garantia de seguranca para producao publica.
- Audit log permanece ligado em `ldk/audit/log.md`.
- O historico LDK anterior foi preservado em `ldk/history/v0.1/` e nao autoriza novo `DONE`.

## Pressupostos

- O codigo em `main` representa a baseline que deve ser endurecida, nao reconstruida.
- Credenciais reais e testes com WhatsApp continuam dependendo do ambiente do proprietario.
- A proxima frente recomendada e ownership/revalidacao do run do agente.

## Pendencias [VERIFY]

- [ ] Antes de release publico, decidir autenticação e substituir policies anon do workspace default.
- [ ] Definir politica de retencao/exclusao de mensagens, contatos e logs.
- [ ] Substituir a chave publicavel usada nos ticks por credencial server-only dedicada.
- [ ] Configurar teste reproduzivel e CI para os proofs P3/P4.
- [ ] Sanear o lint herdado em mudanca mecanica separada antes de torna-lo gate de release.

## Resumo do raciocinio

- Entendimento: produto operacional existente; a prioridade e confiabilidade e seguranca, nao novas telas.
- Sinais relevantes: PII, provedores externos, webhook publico, cron, concorrencia e disparo em massa.
- Preocupacoes priorizadas: acesso, ownership de jobs, limites atomicos, falhas externas, observabilidade e prova.
- Descartado com confianca: pagamento, SEO e rastreamento de marketing no escopo atual.
- Confirmacao historica: o intake original e o audit log registram a finalidade; a migracao solicitada confirma a
  continuidade dessa finalidade, sem alterar produto ou stack.

## Resumo do entendimento

O Pure Start e uma ferramenta operacional de workspace unico para atendimento e campanhas no WhatsApp. O operador
configura conexoes e agentes, acompanha conversas, importa contatos e executa campanhas com medidas anti-abuso. A
baseline funcional deve ser preservada. O ciclo atual prioriza impedir runs duplicados ou obsoletos, tratar falhas de
tools/LLM, registrar observabilidade sanitizada e provar limites concorrentes. Auth real, isolamento multiusuario,
retencao LGPD, credencial dedicada dos ticks e CI forte sao gates antes de exposicao publica, sem bloquear o
hardening interno planejado.

## External review packet

```text
Revise o entendimento de projeto abaixo antes de qualquer mudanca estrutural.

Produto operacional de workspace unico para atendimento por IA e campanhas no WhatsApp. A baseline funcional
existe. O ciclo atual prioriza ownership/revalidacao de runs, resiliencia de tools/LLM, observabilidade sem PII e
prova de limites atomicos. Auth real, retencao LGPD, credencial dedicada dos ticks e CI sao gates de release publico.

Procure contradicoes, riscos omitidos e complexidade desnecessaria. Classifique sugestoes como essencial antes do
roadmap, recomendavel, opcional ou provavelmente desnecessaria. Nao implemente.
```

## External review reconciliation

| Suggestion | LDK assessment | Impact | Recommendation | User decision |
|------------|----------------|--------|----------------|---------------|
| Nenhuma revisao externa nesta revision | aligned | none | defer | not requested |
