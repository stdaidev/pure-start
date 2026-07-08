CREATE TABLE public.agent_ignored_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id(),
  phone_e164 text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, phone_e164)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_ignored_numbers TO authenticated;
GRANT ALL ON public.agent_ignored_numbers TO service_role;

ALTER TABLE public.agent_ignored_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members manage ignored numbers"
  ON public.agent_ignored_numbers
  FOR ALL
  TO authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());

CREATE TRIGGER trg_agent_ignored_numbers_updated_at
  BEFORE UPDATE ON public.agent_ignored_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_agent_ignored_numbers_workspace ON public.agent_ignored_numbers (workspace_id);