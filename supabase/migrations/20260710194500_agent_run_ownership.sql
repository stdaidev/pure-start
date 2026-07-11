ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS agent_run_token uuid,
  ADD COLUMN IF NOT EXISTS agent_run_started_at timestamptz;

COMMENT ON COLUMN public.conversations.agent_run_token IS
  'Token de ownership do run atual; somente o mesmo token pode liberar ou produzir efeitos externos.';
COMMENT ON COLUMN public.conversations.agent_run_started_at IS
  'Inicio do ownership atual, usado apenas para recuperar runs realmente abandonados.';

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
    updated_at = now()
  WHERE id = _conversation_id;
END;
$$;

ALTER TABLE public.agents ALTER COLUMN model SET DEFAULT 'gpt-4.1-mini';
UPDATE public.agents
SET model = 'gpt-4.1-mini', updated_at = now()
WHERE model = 'google/gemini-2.5-flash';

DROP FUNCTION IF EXISTS public.claim_due_agent_runs(integer);
DROP FUNCTION IF EXISTS public.release_agent_run(uuid);

CREATE FUNCTION public.claim_due_agent_runs(_limit integer DEFAULT 10)
RETURNS TABLE(conversation_id uuid, message_id uuid, run_token uuid)
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
        c.agent_run_token IS NULL
        OR c.agent_run_started_at < now() - interval '10 minutes'
      )
    ORDER BY c.agent_run_at ASC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 10), 1), 25)
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.conversations c
    SET
      agent_run_token = gen_random_uuid(),
      agent_run_started_at = now(),
      agent_running_since = now(),
      agent_run_at = NULL,
      updated_at = now()
    FROM due
    WHERE c.id = due.id
    RETURNING c.id, due.agent_latest_message_id, c.agent_run_token
  )
  SELECT claimed.id, claimed.agent_latest_message_id, claimed.agent_run_token
  FROM claimed;
END;
$$;

CREATE FUNCTION public.release_agent_run(_conversation_id uuid, _run_token uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count integer;
BEGIN
  UPDATE public.conversations
  SET
    agent_run_token = NULL,
    agent_run_started_at = NULL,
    agent_running_since = NULL,
    updated_at = now()
  WHERE id = _conversation_id
    AND agent_run_token = _run_token;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_due_agent_runs(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_agent_run(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_agent_runs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_agent_run(uuid, uuid) TO service_role;

CREATE INDEX IF NOT EXISTS conversations_agent_run_token_idx
  ON public.conversations (agent_run_token)
  WHERE agent_run_token IS NOT NULL;
