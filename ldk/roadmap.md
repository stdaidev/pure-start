# LDK Roadmap

Status: current
Discovery revision: 1
Updated: 2026-07-10
Source: `ldk/discovery.md` revision 1 and migrated active backlog

## Next recommended feature

- Feature: F1 - ownership do run do agente.
- Why: fecha a maior janela conhecida de resposta duplicada, obsoleta ou posterior a handoff/blocklist.
- Etapa concluida: roadmap migrado; F1 aguarda aprovacao consciente do plano.

## Feature order

| ID | Feature | Depends on | Readiness | Risk | Proof | Reason |
|----|---------|------------|-----------|------|-------|--------|
| F1 | Ownership/revalidacao do run | baseline | ready | alto | P4 | Previne envio por run velho e destrava o hardening seguinte |
| F6 | Prova concorrente dos limites por conexao | baseline | verify | alto | P4 | RPC existe; falta stress test atual e CI |
| F2 | Tools e OpenAI resilientes | F1 | blocked | medio | P2 | Assume status e ownership confiaveis do runtime |
| F3 | Observabilidade estruturada | F1, F2 | blocked | medio | P2 | Depende dos status e error codes estabilizados |
| F7 | Suite E2E do runtime | F1, F2, F3 | later | alto | P4 | Consolida prova do caminho critico antes de release publico |
| F4 | Tools com aprovacao humana | F1, F2, F3 | later | alto | P4 | Novo comportamento sensivel; nao pertence ao hardening imediato |
| F5 | Memoria incremental | F3 | later | medio | P2 | Exige retencao/privacidade e observabilidade definidas |

## Blockers

| Feature | Blocker | Needed decision/evidence |
|---------|---------|--------------------------|
| F6 | Ambiente real e CI ainda nao preparados | Duas campanhas concorrentes, referencias de CI/diff e checklist P4 |
| F2 | F1 ainda nao concluida | Proof P4 de F1 |
| F3 | Status/error codes ainda mudarao | F1 e F2 done |
| F7 | Infra de teste inexistente | Test runner, fixtures/mocks, CI e smoke browser |
| Release publico | Auth/RLS e credencial dos ticks | Decisao e implementacao antes de GO |

## Later / out of MVP

- F4, F5 e expansao multi-workspace.
- Analytics de marketing, SEO, pagamentos e API oficial do WhatsApp.

## Etapa concluida

- Roadmap pronto e aguardando aprovacao do plano de F1.

## Readiness vocabulary

- `ready`: pode planejar/aprovar agora.
- `blocked`: depende de feature, decisao, acesso ou risco nao resolvido.
- `later`: fora do recorte imediato.
- `done`: concluida com proof atual.
- `verify`: precisa evidencia/ambiente antes de executar ou promover.
