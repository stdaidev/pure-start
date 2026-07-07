-- F3 T2: colunas agents.tools/humanization, connections.default_agent_id, tabela conversation_markers
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS humanization jsonb NOT NULL DEFAULT '{"chunk":true,"min_ms":800,"max_ms":3500}'::jsonb;

ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS default_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.conversation_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_markers_conv_idx
  ON public.conversation_markers (conversation_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_markers TO anon, authenticated;
GRANT ALL ON public.conversation_markers TO service_role;

ALTER TABLE public.conversation_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_markers_default_all ON public.conversation_markers FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());