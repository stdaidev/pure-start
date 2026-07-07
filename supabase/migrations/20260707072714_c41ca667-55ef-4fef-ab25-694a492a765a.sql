
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id(),
  provider text NOT NULL,
  event_type text,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_events_workspace_created ON public.webhook_events(workspace_id, created_at DESC);

GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Auditoria interna; nao expor via Data API (nem anon nem authenticated)
CREATE POLICY "webhook_events service_role only"
  ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Unicidade de mensagens por provider+external_id para idempotencia de webhook
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id
  ON public.messages(workspace_id, external_id)
  WHERE external_id IS NOT NULL;
