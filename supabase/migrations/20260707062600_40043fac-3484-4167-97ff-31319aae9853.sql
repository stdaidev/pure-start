-- Shared trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper to expose the default workspace id (stable, referenced by other tables' defaults/policies)
CREATE OR REPLACE FUNCTION public.default_workspace_id()
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT '00000000-0000-0000-0000-000000000001'::uuid;
$$;

-- Workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO anon, authenticated;
GRANT ALL ON public.workspaces TO service_role;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- v1 sem login: policy única restringe acesso ao workspace default.
-- Quando login for adicionado, substituir por policy baseada em auth.uid()/membership.
CREATE POLICY "workspaces_default_only_all"
ON public.workspaces
FOR ALL
TO anon, authenticated
USING (id = public.default_workspace_id())
WITH CHECK (id = public.default_workspace_id());

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default workspace row
INSERT INTO public.workspaces (id, name, slug)
VALUES (public.default_workspace_id(), 'Default Workspace', 'default')
ON CONFLICT (id) DO NOTHING;