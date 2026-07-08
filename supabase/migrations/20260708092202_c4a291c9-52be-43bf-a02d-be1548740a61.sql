CREATE TABLE public.workspace_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
-- NENHUM GRANT para anon/authenticated: acesso somente via service_role (server-only).
GRANT ALL ON public.workspace_secrets TO service_role;
ALTER TABLE public.workspace_secrets ENABLE ROW LEVEL SECURITY;
-- Sem policies: cliente Data API nao le/escreve nada. service_role bypassa RLS.
CREATE TRIGGER trg_workspace_secrets_updated_at BEFORE UPDATE ON public.workspace_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON TABLE public.workspace_secrets IS 'F7: credenciais de provedores por workspace. Leitura/escrita SOMENTE via server functions com service_role. v1 armazena em texto plano — encryption-at-rest fica para v2 (KMS).';