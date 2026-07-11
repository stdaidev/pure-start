CREATE FUNCTION public.try_reserve_campaign_slot(
  _campaign_id uuid,
  _daily_limit integer,
  _now timestamptz DEFAULT now()
)
RETURNS TABLE(
  reserved boolean,
  hour_full boolean,
  day_full boolean,
  reservation_hour timestamptz,
  reservation_day date
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := COALESCE(_now, now());
  hour_key timestamptz := date_trunc('hour', now_ts);
  day_key date := (now_ts AT TIME ZONE 'America/Sao_Paulo')::date;
  row_campaign public.campaigns%ROWTYPE;
  current_hour integer;
  current_day integer;
  safe_daily_limit integer;
BEGIN
  SELECT * INTO row_campaign
  FROM public.campaigns
  WHERE id = _campaign_id
  FOR UPDATE;

  IF NOT FOUND OR row_campaign.status <> 'running' THEN
    reserved := false;
    hour_full := false;
    day_full := false;
    reservation_hour := hour_key;
    reservation_day := day_key;
    RETURN NEXT;
    RETURN;
  END IF;

  current_hour := CASE
    WHEN date_trunc('hour', row_campaign.sent_this_hour_at) = hour_key
      THEN COALESCE(row_campaign.sent_this_hour, 0)
    ELSE 0
  END;
  current_day := CASE
    WHEN row_campaign.sent_today_date = day_key
      THEN COALESCE(row_campaign.sent_today, 0)
    ELSE 0
  END;
  safe_daily_limit := LEAST(
    GREATEST(COALESCE(_daily_limit, row_campaign.daily_cap), 0),
    row_campaign.daily_cap
  );

  hour_full := current_hour >= row_campaign.hourly_limit;
  day_full := current_day >= safe_daily_limit;
  reservation_hour := hour_key;
  reservation_day := day_key;

  IF hour_full OR day_full THEN
    reserved := false;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.campaigns
  SET
    sent_this_hour = current_hour + 1,
    sent_this_hour_at = hour_key,
    sent_today = current_day + 1,
    sent_today_date = day_key,
    updated_at = now_ts
  WHERE id = _campaign_id;

  reserved := true;
  RETURN NEXT;
END;
$$;

CREATE FUNCTION public.release_campaign_slot(
  _campaign_id uuid,
  _reservation_hour timestamptz,
  _reservation_day date
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count integer;
BEGIN
  UPDATE public.campaigns
  SET
    sent_this_hour = CASE
      WHEN date_trunc('hour', sent_this_hour_at) = date_trunc('hour', _reservation_hour)
        THEN GREATEST(COALESCE(sent_this_hour, 0) - 1, 0)
      ELSE sent_this_hour
    END,
    sent_today = CASE
      WHEN sent_today_date = _reservation_day
        THEN GREATEST(COALESCE(sent_today, 0) - 1, 0)
      ELSE sent_today
    END,
    updated_at = now()
  WHERE id = _campaign_id;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_reserve_campaign_slot(uuid, integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_campaign_slot(uuid, timestamptz, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_reserve_campaign_slot(uuid, integer, timestamptz)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_campaign_slot(uuid, timestamptz, date)
  TO service_role;

