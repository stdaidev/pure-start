# LDK Roadmap

Status: current
Discovery revision: 1
Updated: 2026-07-11
Source: `ldk/discovery.md` revision 1 and migrated active backlog

## Next recommended feature

- Feature: F1 - fechar ownership do run do agente em P4.
- Why: F1 esta `partial`; falta provar AC5 com dois ticks concorrentes e provider mockado. O fechamento destrava F2
  e F3 e exige CI verde do commit que incorporar o harness.
- Etapa concluida: roadmap reconciliado; F1 aguarda harness concorrente versionado e proof P4.

## Feature order

| ID | Feature | Depends on | Readiness | Risk | Proof | Reason |
|----|---------|------------|-----------|------|-------|--------|
| F1 | Ownership/revalidacao do run | baseline | verify | alto | P4 | Ledger `partial`; falta harness concorrente versionado para AC5 e consolidacao P4 |
| F6 | Prova concorrente dos limites por conexao | baseline | verify | alto | P4 | Ledger `building`; SQL/smoke remoto ok, falta harness concorrente versionado e P4 |
| F2 | Tools e OpenAI resilientes | F1 | blocked | medio | P2 | Ledger `partial`; a dependencia explicita exige F1 done antes da prova P2 final |
| F3 | Observabilidade estruturada | F1, F2 | blocked | medio | P2 | Ledger `planned`; depende dos status/error codes estabilizados por F1 e F2 |
| F7 | Suite E2E do runtime | F1, F2, F3 | later | alto | P4 | Test runner e CI existem; falta consolidar a suite E2E apos as features fundacionais |
| F4 | Tools com aprovacao humana | F1, F2, F3 | later | alto | P4 | Novo comportamento sensivel; nao pertence ao hardening imediato |
| F5 | Memoria incremental | F3 | later | medio | P2 | Exige retencao/privacidade e observabilidade definidas |

## Blockers

| Feature | Blocker | Needed decision/evidence |
|---------|---------|--------------------------|
| F1 | AC5 sem harness concorrente versionado | Dois ticks para a mesma mensagem com provider mockado provando no maximo um efeito; CI/diff e checklist P4 |
| F6 | Harness concorrente versionado ausente | Duas campanhas disputando a mesma conexao sem exceder cap e com compensacao correta; CI/diff e checklist P4 |
| F2 | F1 ainda nao concluida e proof P2 pendente | F1 em P4; verificar default/backfill do modelo e fluxos mockados no estado atual |
| F3 | Status e error codes ainda dependem de F1/F2 | F1 e F2 encerradas com a prova exigida |
| F7 | Suite E2E do runtime ainda incompleta | Completar fixtures/mocks e smoke browser depois de F1, F2 e F3; infraestrutura base ja existe |
| Release publico | Auth/RLS e credencial dos ticks | Decisao e implementacao antes de GO |

## Later / out of MVP

- F4, F5 e expansao multi-workspace.
- Analytics de marketing, SEO, pagamentos e API oficial do WhatsApp.

## Etapa concluida

- Roadmap reconciliado; aguardando harness concorrente versionado de F1 para destravar F2 e F3.

## Readiness vocabulary

- `ready`: pode planejar/aprovar agora.
- `blocked`: depende de feature, decisao, acesso ou risco nao resolvido.
- `later`: fora do recorte imediato.
- `done`: concluida com proof atual.
- `verify`: precisa evidencia/ambiente antes de executar ou promover.
