DROP INDEX IF EXISTS public.idx_messages_external_id;
CREATE UNIQUE INDEX idx_messages_external_id
  ON public.messages (workspace_id, conversation_id, external_id)
  WHERE external_id IS NOT NULL;