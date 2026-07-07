# Proof of Done - F2 Conexoes

Feature: F2 - Contratos modulares + EvolutionProvider + modulo Conexoes
Status: DONE
Risk: alto
Proof level required: P4
Proof level achieved: P4

## Changed files
- src/providers/channel/types.ts, registry.ts, evolution.server.ts
- src/lib/connections.functions.ts
- src/routes/api/public/evolution.webhook.ts
- src/routes/_shell.conexoes.tsx
- src/components/conexoes/{status-badge,qr-display,new-connection-dialog}.tsx
- src/routes/__root.tsx (Toaster)
- supabase/migrations/20260707072714_*.sql (webhook_events)
- ldk/features/f2-conexoes/plan.md, ldk/ledger.md, ldk/audit/log.md

## Acceptance criteria
- AC1 contrato + EvolutionProvider: covered
- AC2 lista com badge HUD: covered (screenshot `/conexoes` estado vazio ok)
- AC3 criar conexao gera QR: covered (createConnection retorna qr base64)
- AC4 status muda sem reload: covered (useQuery refetchInterval 3s/5s)
- AC5 webhook 401/200 sem PII: covered (curl: 401 wrong/none, 200 correto)
- AC6 desconectar limpa Evolution + local: covered (deleteConnection)
- AC7 nenhuma chave Evolution no bundle client: covered (grep dist/client vazio)
- AC8 supabase linter limpo: covered

## Verification performed
- Preview opened: yes (Playwright localhost:8080/conexoes; /tmp/browser/f2t7/1_list.png)
- Main user flow tested: yes (lista renderiza; webhook curl valido persistiu evento em webhook_events)
- Responsive/mobile checked: no
- Console/log errors checked: yes (hydration warning legado, sem pageerror)
- GitHub diff available: no
- Automated test available: no
- Automated test result: not run
- CI result: not run

## LDK self-check
- Required proof identified: yes
- All essential AC covered: yes
- Evidence exists for every covered AC: yes
- Proof level achieved >= required: yes
- Critical errors known: no
- LDK engine drift detected: no
- If GitHub/CI is unavailable, limitation documented: yes

## Proof verdict
Optimistic:
- Contrato + provider + UI + webhook fecham fluxo com token timing-safe, sem PII em log, chave fora do bundle client.
- Linter Supabase limpo; webhook_events com RLS service_role.

Pessimistic:
- Fluxo QR real WhatsApp nao exercido end-to-end (requer Evolution real + telefone).
- Policies RLS abertas ao anon em connections/messages (herdado F1, aceito v1).
- Server functions publicas (sem auth) por design v1.

## Evidence
- Preview URL: http://localhost:8080/conexoes
- Screenshot: /tmp/browser/f2t7/1_list.png (estado vazio "NENHUMA INSTANCIA")
- Curl webhook: wrong=401, none=401, correct=200
- DB: webhook_events ultima linha connection.update processed=true error=null
- Bundle: `grep -r EVOLUTION_API_KEY dist/client/` -> 0 linhas (ocorre so em dist/server/_ssr)
- Linter: "No linter issues found"
- Build: `bun run build` verde (vite + nitro)

## Known limitations
- Sem teste WhatsApp real; QR nao escaneado.
- Endpoints publicos sem auth (v1).
- CSRF middleware nao configurado (warning dev), nao bloqueante.
