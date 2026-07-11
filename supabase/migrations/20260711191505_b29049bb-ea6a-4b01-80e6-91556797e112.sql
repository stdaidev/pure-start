
-- 1) Destrava a conversa presa e reagenda para o proximo tick
UPDATE public.conversations
SET agent_run_token = NULL,
    agent_run_started_at = NULL,
    agent_running_since = NULL,
    agent_run_at = now(),
    updated_at = now()
WHERE agent_run_token IS NOT NULL
  AND agent_run_started_at < now() - interval '90 seconds';

-- 2) Reduz janela de reclaim de 10min para 90s
CREATE OR REPLACE FUNCTION public.claim_due_agent_runs(_limit integer DEFAULT 10)
 RETURNS TABLE(conversation_id uuid, message_id uuid, run_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        OR c.agent_run_started_at < now() - interval '90 seconds'
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
$function$;
