ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS debounce_seconds integer;

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_debounce_seconds_range;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_debounce_seconds_range
  CHECK (debounce_seconds IS NULL OR (debounce_seconds >= 0 AND debounce_seconds <= 10));

COMMENT ON COLUMN public.agents.debounce_seconds IS
  'Janela de empilhamento (segundos) por conversa antes de disparar o runtime. NULL ou 0 = usa default do sistema (AGENT_DEBOUNCE_MS). Cap 10s.';