
-- F6.1 T1 - Anti-ban hardening + multi-instancia
-- Novos campos anti-ban, kill-switch global, tabela de conexoes por campanha.

-- workspaces: kill-switch global
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS dispatch_paused boolean NOT NULL DEFAULT false;

-- campaigns: hourly cap, dispatch mode
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS hourly_limit integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS sent_this_hour integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_this_hour_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_mode text NOT NULL DEFAULT 'single';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_dispatch_mode_check'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_dispatch_mode_check
      CHECK (dispatch_mode IN ('single','multi'));
  END IF;
END $$;

-- campaign_recipients: scheduling + retry + rastreio de conexao
ALTER TABLE public.campaign_recipients
  ADD COLUMN IF NOT EXISTS next_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL;

-- Backfill: pendentes existentes ficam elegiveis imediatamente
UPDATE public.campaign_recipients
  SET next_send_at = created_at
  WHERE status = 'pending' AND next_send_at IS NULL;

-- Indice para claim eficiente
CREATE INDEX IF NOT EXISTS campaign_recipients_claim_idx
  ON public.campaign_recipients (campaign_id, status, next_send_at);

-- Indice para round-robin (uso recente por conexao)
CREATE INDEX IF NOT EXISTS campaign_recipients_last_conn_idx
  ON public.campaign_recipients (campaign_id, last_connection_id, sent_at DESC);

-- Nova tabela: conexoes vinculadas a uma campanha (modo multi)
CREATE TABLE IF NOT EXISTS public.campaign_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, connection_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_connections TO authenticated;
GRANT ALL ON public.campaign_connections TO service_role;

ALTER TABLE public.campaign_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='campaign_connections'
      AND policyname='campaign_connections_default_workspace_all'
  ) THEN
    CREATE POLICY campaign_connections_default_workspace_all
      ON public.campaign_connections
      FOR ALL
      USING (workspace_id = public.default_workspace_id())
      WITH CHECK (workspace_id = public.default_workspace_id());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS campaign_connections_campaign_idx
  ON public.campaign_connections (campaign_id, position);
