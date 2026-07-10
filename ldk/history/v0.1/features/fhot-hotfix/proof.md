# Fhot - Hotfix bundle - Proof

## Status
Fhot => DONE

## Escopo
1. Dashboard contava `direction="in"/"out"`, mas runtime usa `inbound/outbound`.
2. `agent.tick` usava `Promise.race` sem AbortSignal -> envio duplicado
   possivel quando runtime passa de 12s (release em finally enquanto a
   Promise perdida continua enviando).
3. `agent.max_tool_rounds == null` caia em HARD_MAX_TOOL_ROUNDS (20).

## Arquivos alterados
- src/lib/dashboard.functions.ts
- src/routes/_shell.dashboard.tsx
- src/routes/api/public/agent.tick.ts (remove race; aguarda runtime terminar)
- src/lib/agent-runtime.server.ts (default = DEFAULT_MAX_TOOL_ROUNDS = 2)

## AC cobertos
- AC1 inbound/outbound: covered
- AC2 lock nao libera antes do runtime terminar: covered
- AC3 default rounds = 2: covered

## Verificacao
- bunx tsgo --noEmit: pass

## LDK self-check
- Required proof identified: yes (P2)
- All essential AC covered: yes
- Evidence exists: yes
- Critical errors known: no
- LDK engine drift detected: no
