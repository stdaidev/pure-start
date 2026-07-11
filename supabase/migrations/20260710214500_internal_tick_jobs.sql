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
    SELECT jobid
    FROM cron.job
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
            SELECT value
            FROM public.workspace_secrets
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
            SELECT value
            FROM public.workspace_secrets
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
