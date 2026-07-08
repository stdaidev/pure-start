REVOKE EXECUTE ON FUNCTION public.try_agent_lock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_agent_lock(uuid) FROM PUBLIC, anon, authenticated;