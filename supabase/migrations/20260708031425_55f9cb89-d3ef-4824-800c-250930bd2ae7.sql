ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS max_tokens integer,
  ADD COLUMN IF NOT EXISTS max_tool_rounds integer;