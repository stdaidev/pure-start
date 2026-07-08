CREATE OR REPLACE FUNCTION public.try_agent_lock(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_try_advisory_lock(hashtext(_conversation_id::text));
$$;

CREATE OR REPLACE FUNCTION public.release_agent_lock(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_unlock(hashtext(_conversation_id::text));
$$;

GRANT EXECUTE ON FUNCTION public.try_agent_lock(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_agent_lock(uuid) TO service_role;