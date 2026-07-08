
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS cooldown_default_hours integer NOT NULL DEFAULT 24;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS cooldown_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cooldown_value integer,
  ADD COLUMN IF NOT EXISTS cooldown_unit text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='campaigns_cooldown_unit_check') THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_cooldown_unit_check
      CHECK (cooldown_unit IS NULL OR cooldown_unit IN ('hours','days'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_ws_direction_created
  ON public.messages (workspace_id, direction, created_at DESC);
