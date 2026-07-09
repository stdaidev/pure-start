
-- F-antiban-conexao: cota global por WhatsApp (connection_id)
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS dispatch_hourly_limit int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS dispatch_daily_limit int NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS dispatch_sent_this_hour int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatch_sent_this_hour_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS dispatch_sent_today int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatch_sent_today_date text NULL;

-- F10: CRM leve dentro da conversa
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_value_cents int NULL,
  ADD COLUMN IF NOT EXISTS lead_value_currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS lead_value_note text NULL,
  ADD COLUMN IF NOT EXISTS lead_outcome text NULL,
  ADD COLUMN IF NOT EXISTS crm_updated_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_lead_value_cents_nonneg'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_lead_value_cents_nonneg
      CHECK (lead_value_cents IS NULL OR lead_value_cents >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_lead_outcome_check'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_lead_outcome_check
      CHECK (lead_outcome IS NULL OR lead_outcome IN ('won','lost'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS conversations_tags_gin
  ON public.conversations USING gin (tags);
