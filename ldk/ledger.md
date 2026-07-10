# LDK Task Ledger

| ID | Feature | Risk | State | Proof required | Last evidence |
|----|---------|------|-------|----------------|---------------|
| F1 | Ownership do run do agente com token e revalidacao antes de envio | alto | partial | P4 | `ldk/features/f1-agent-run-lock/evidence.md` |
| F2 | Tools resilientes, erros OpenAI classificados e model default | medio | partial | P2 | `ldk/features/f2-openai-resilience/evidence.md` |
| F3 | Observabilidade estruturada e sanitizada do agente | medio | planned | P2 | |
| F4 | Tools do agente com aprovacao humana | alto | idea | P4 | |
| F5 | Memoria e resumo incremental por conversa | medio | idea | P2 | |
| F6 | Prova concorrente dos limites globais por conexao | alto | partial | P4 | `docs/security-review-2026-07-10.md` |
| F7 | Suite E2E e fechamento de prova do runtime existente | alto | idea | P4 | |

## Baseline anterior

As features implementadas antes do schema 2 nao sao reclassificadas como novas entregas. O snapshot, proofs e
limitacoes permanecem em `ldk/history/v0.1/`. Qualquer feature reaberta recebe novo ID/plano nesta ledger e precisa
de evidencia atual.
