-- === 20260710194500_agent_run_ownership.sql ===
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

-- === 20260710212000_atomic_campaign_quota.sql ===
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
  SELECT * INTO row_campaign FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;

  IF NOT FOUND OR row_campaign.status <> 'running' THEN
    reserved := false; hour_full := false; day_full := false;
    reservation_hour := hour_key; reservation_day := day_key;
    RETURN NEXT; RETURN;
  END IF;

  current_hour := CASE
    WHEN date_trunc('hour', row_campaign.sent_this_hour_at) = hour_key
      THEN COALESCE(row_campaign.sent_this_hour, 0)
    ELSE 0 END;
  current_day := CASE
    WHEN row_campaign.sent_today_date = day_key
      THEN COALESCE(row_campaign.sent_today, 0)
    ELSE 0 END;
  safe_daily_limit := LEAST(
    GREATEST(COALESCE(_daily_limit, row_campaign.daily_cap), 0),
    row_campaign.daily_cap
  );

  hour_full := current_hour >= row_campaign.hourly_limit;
  day_full := current_day >= safe_daily_limit;
  reservation_hour := hour_key; reservation_day := day_key;

  IF hour_full OR day_full THEN
    reserved := false; RETURN NEXT; RETURN;
  END IF;

  UPDATE public.campaigns
  SET sent_this_hour = current_hour + 1,
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
  SET sent_this_hour = CASE
        WHEN date_trunc('hour', sent_this_hour_at) = date_trunc('hour', _reservation_hour)
          THEN GREATEST(COALESCE(sent_this_hour, 0) - 1, 0)
        ELSE sent_this_hour END,
      sent_today = CASE
        WHEN sent_today_date = _reservation_day
          THEN GREATEST(COALESCE(sent_today, 0) - 1, 0)
        ELSE sent_today END,
      updated_at = now()
  WHERE id = _campaign_id;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_reserve_campaign_slot(uuid, integer, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_campaign_slot(uuid, timestamptz, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_reserve_campaign_slot(uuid, integer, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_campaign_slot(uuid, timestamptz, date) TO service_role;

-- === 20260710214500_internal_tick_jobs.sql ===
INSERT INTO public.workspace_secrets (workspace_id, name, value)
VALUES (
  public.default_workspace_id(),
  'INTERNAL_TICK_TOKEN',
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
)
ON CONFLICT (workspace_id, name) DO NOTHING;

INSERT INTO public.workspace_secrets (workspace_id, name, value)
VALUES (
  public.default_workspace_id(),
  'PUBLIC_APP_URL',
  'https://light-springboard.lovable.app'
)
ON CONFLICT (workspace_id, name) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

DO $migration$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('agent_tick_every_5s', 'dispatch_tick_every_min')
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'agent_tick_every_5s',
    '5 seconds',
    $job$
      SELECT net.http_post(
        url := (
          SELECT rtrim(value, '/') || '/api/public/agent/tick'
          FROM public.workspace_secrets
          WHERE workspace_id = public.default_workspace_id()
            AND name = 'PUBLIC_APP_URL'
        ),
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-internal-token', (
            SELECT value FROM public.workspace_secrets
            WHERE workspace_id = public.default_workspace_id()
              AND name = 'INTERNAL_TICK_TOKEN'
          )
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  PERFORM cron.schedule(
    'dispatch_tick_every_min',
    '* * * * *',
    $job$
      SELECT net.http_post(
        url := (
          SELECT rtrim(value, '/') || '/api/public/dispatch/tick'
          FROM public.workspace_secrets
          WHERE workspace_id = public.default_workspace_id()
            AND name = 'PUBLIC_APP_URL'
        ),
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'x-internal-token', (
            SELECT value FROM public.workspace_secrets
            WHERE workspace_id = public.default_workspace_id()
              AND name = 'INTERNAL_TICK_TOKEN'
          )
        ),
        body := '{}'::jsonb
      );
    $job$
  );
END;
$migration$;