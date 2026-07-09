CREATE OR REPLACE FUNCTION public.try_reserve_connection_slot(_connection_id uuid)
RETURNS TABLE(reserved boolean, hour_full boolean, day_full boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
  hour_key timestamptz := date_trunc('hour', now_ts);
  day_key date := (now_ts AT TIME ZONE 'America/Sao_Paulo')::date;
  row_conn public.connections%ROWTYPE;
  cur_hour integer;
  cur_day integer;
BEGIN
  SELECT * INTO row_conn FROM public.connections
    WHERE id = _connection_id
    FOR UPDATE;

  IF NOT FOUND THEN
    reserved := false; hour_full := false; day_full := false; RETURN NEXT; RETURN;
  END IF;

  cur_hour := CASE
    WHEN row_conn.dispatch_sent_this_hour_at IS NOT NULL
      AND date_trunc('hour', row_conn.dispatch_sent_this_hour_at) = hour_key
    THEN COALESCE(row_conn.dispatch_sent_this_hour, 0)
    ELSE 0
  END;
  cur_day := CASE
    WHEN row_conn.dispatch_sent_today_date = day_key
    THEN COALESCE(row_conn.dispatch_sent_today, 0)
    ELSE 0
  END;

  hour_full := cur_hour >= COALESCE(row_conn.dispatch_hourly_limit, 60);
  day_full  := cur_day  >= COALESCE(row_conn.dispatch_daily_limit, 200);

  IF hour_full OR day_full THEN
    reserved := false; RETURN NEXT; RETURN;
  END IF;

  UPDATE public.connections
  SET
    dispatch_sent_this_hour = cur_hour + 1,
    dispatch_sent_this_hour_at = hour_key,
    dispatch_sent_today = cur_day + 1,
    dispatch_sent_today_date = day_key,
    updated_at = now_ts
  WHERE id = _connection_id;

  reserved := true;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_connection_slot(_connection_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.connections
  SET
    dispatch_sent_this_hour = GREATEST(COALESCE(dispatch_sent_this_hour,0) - 1, 0),
    dispatch_sent_today = GREATEST(COALESCE(dispatch_sent_today,0) - 1, 0),
    updated_at = now()
  WHERE id = _connection_id;
$$;

REVOKE ALL ON FUNCTION public.try_reserve_connection_slot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_connection_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_reserve_connection_slot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_connection_slot(uuid) TO service_role;