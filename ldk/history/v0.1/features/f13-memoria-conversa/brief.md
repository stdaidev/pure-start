# F13 - Memoria/resumo incremental por conversa (planned)

Nao implementar agora. Registrar como proxima etapa apos Fagx-*.

Escopo previsto:
- Tabela `conversation_memory` (workspace_id, conversation_id, summary,
  facts jsonb, updated_at).
- Fatos: produto de interesse, objecoes, preferencia de horario,
  orcamento aproximado.
- Resumo incremental via LLM ao fim de cada run bem-sucedido.
- Injecao do resumo no system prompt (F10 ja injeta tags/valor).

Fora de escopo v1:
- Vector store / embeddings.
- UI para editar memoria manualmente.