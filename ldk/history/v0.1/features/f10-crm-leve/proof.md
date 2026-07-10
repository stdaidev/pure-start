# F10 - CRM leve - Proof

## Status
F10 => DONE

## Arquivos alterados
- migration (conversations.tags, lead_value_*, outcome, crm_updated_at, GIN)
- src/lib/conversations.functions.ts
- src/components/conversas/crm-panel.tsx (novo)
- src/components/conversas/conversation-list.tsx (badge/tags)
- src/routes/_shell.conversas.tsx (painel + filtro por tag + header)
- src/lib/agent-runtime.server.ts (contexto interno no system prompt)

## AC cobertos
- AC1 Migration+GIN: covered
- AC2 updateConversationCrm Zod + normalizacao: covered
- AC3 UI painel CRM sem sair da conversa: covered
- AC4 Badge no header/lista: covered
- AC5 Filtro por tag: covered
- AC6 Contexto no system prompt: covered
- AC7 Sem log de PII/content: covered

## Verificacao
- bunx tsgo --noEmit: pass
- types regenerados

## Limitacoes
- Preview visual manual pendente
- Sem tool automatica (F12 planejada)

## LDK self-check
- Required proof identified: yes (P2)
- Critical errors: no
