# F12 - Tools do agente com aprovacao (planejamento)

Nao implementar agora. Registrar como proxima etapa.

Escopo:
- Tools: sugerir_tags_conversa(tags[]), sugerir_valor_lead(cents, moeda, nota?)
- Tabela agent_suggestions (conversation_id, kind, payload, status,
  created_at, resolved_at, resolved_by)
- agents.require_approval (default true para tools sensiveis)
- UI: chip "sugestao pendente" no header, aceitar/ignorar
- Metrica: sugestoes aceitas vs ignoradas

Fora de escopo v1:
- Aprovacao multi-usuario / RBAC
- Tools destrutivas via agente
