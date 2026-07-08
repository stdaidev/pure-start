ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS agent_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_running_since timestamptz,
  ADD COLUMN IF NOT EXISTS agent_latest_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_agent_due_idx
  ON public.conversations (agent_run_at)
  WHERE agent_run_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversations_agent_running_idx
  ON public.conversations (agent_running_since)
  WHERE agent_running_since IS NOT NULL;

COMMENT ON COLUMN public.conversations.agent_run_at IS
  'F8: momento persistente em que o agente deve processar a conversa apos empilhamento/debounce.';
COMMENT ON COLUMN public.conversations.agent_running_since IS
  'F8: trava persistente por linha enquanto o runtime do agente processa a conversa.';
COMMENT ON COLUMN public.conversations.agent_latest_message_id IS
  'F8: ultima mensagem inbound que deve ser usada como gatilho do runtime apos empilhamento.';

CREATE OR REPLACE FUNCTION public.schedule_agent_run(
  _conversation_id uuid,
  _message_id uuid,
  _delay_ms integer
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_delay_ms integer;
BEGIN
  safe_delay_ms := LEAST(GREATEST(COALESCE(_delay_ms, 4000), 0), 10000);

  UPDATE public.conversations
  SET
    agent_latest_message_id = _message_id,
    agent_run_at = now() + make_interval(secs => safe_delay_ms::double precision / 1000.0),
    agent_running_since = CASE
      WHEN agent_running_since IS NOT NULL
        AND agent_running_since < now() - interval '30 seconds'
      THEN NULL
      ELSE agent_running_since
    END,
    updated_at = now()
  WHERE id = _conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_due_agent_runs(_limit integer DEFAULT 10)
RETURNS TABLE(conversation_id uuid, message_id uuid)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT c.id, c.agent_latest_message_id
    FROM public.conversations c
    WHERE c.agent_run_at IS NOT NULL
      AND c.agent_run_at <= now()
      AND c.agent_latest_message_id IS NOT NULL
      AND (
        c.agent_running_since IS NULL
        OR c.agent_running_since < now() - interval '30 seconds'
      )
    ORDER BY c.agent_run_at ASC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 10), 1), 25)
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.conversations c
    SET
      agent_running_since = now(),
      agent_run_at = NULL,
      updated_at = now()
    FROM due
    WHERE c.id = due.id
    RETURNING c.id, due.agent_latest_message_id
  )
  SELECT claimed.id, claimed.agent_latest_message_id
  FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_agent_run(_conversation_id uuid)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.conversations
  SET
    agent_running_since = NULL,
    updated_at = now()
  WHERE id = _conversation_id;
$$;

REVOKE EXECUTE ON FUNCTION public.schedule_agent_run(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_due_agent_runs(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_agent_run(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.schedule_agent_run(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_agent_runs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_agent_run(uuid) TO service_role;