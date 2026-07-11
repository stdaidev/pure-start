# F9 - Blocklist do agente - Plan

## Risk
baixo

## Proof required
P2

## Tasks
| ID | Descricao | AC | Arquivos esperados | Verificacao | State |
|----|-----------|----|--------------------|-------------|-------|
| T1 | Migration `agent_ignored_numbers` + GRANT + RLS | AC1 | supabase migration | linter sem alerta novo | done |
| T2 | Server fns list/add/remove | AC2 | `src/lib/agent-ignored.functions.ts` | tsgo verde | done |
| T3 | UI card em /agentes | AC3 | `src/components/agentes/ignored-numbers-card.tsx`, `src/routes/_shell.agentes.tsx` | tsgo verde | done |
| T4 | Guard no webhook antes de `schedule_agent_run` | AC4 | `src/routes/api/public/evolution.webhook.ts` | tsgo verde | done |
| T5 | Prova manual P2 | AC5 | `ldk/features/f9-agent-blocklist/proof.md` | manual do usuario | proof-pending |

## AC
- AC1: tabela com unique(workspace_id, phone_e164) + RLS.
- AC2: CRUD com E.164 normalizado.
- AC3: UI acessivel em /agentes.
- AC4: mensagem inbound de numero bloqueado nao dispara agente.
- AC5: teste manual documentado.
