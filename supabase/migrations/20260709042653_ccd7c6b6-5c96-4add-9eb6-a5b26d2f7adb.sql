REVOKE EXECUTE ON FUNCTION public.try_reserve_connection_slot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_connection_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_reserve_connection_slot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_connection_slot(uuid) TO service_role;