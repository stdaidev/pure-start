
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS min_ms integer NOT NULL DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS max_ms integer NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS daily_cap integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS window_start text NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS window_end text NOT NULL DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS warmup_per_day integer,
  ADD COLUMN IF NOT EXISTS sent_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_today_date date;

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_min_le_max CHECK (min_ms <= max_ms),
  ADD CONSTRAINT campaigns_min_positive CHECK (min_ms >= 0),
  ADD CONSTRAINT campaigns_daily_cap_positive CHECK (daily_cap >= 1);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_status
  ON public.campaign_recipients(campaign_id, status);
