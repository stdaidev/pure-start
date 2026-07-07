
-- 1. connections
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'evolution',
  status text NOT NULL DEFAULT 'disconnected',
  instance_name text,
  qr_code text,
  webhook_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO anon, authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY connections_default_all ON public.connections FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_connections_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. agents
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  system_prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature numeric NOT NULL DEFAULT 0.7,
  voice_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO anon, authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY agents_default_all ON public.agents FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. contacts
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text,
  phone text NOT NULL,
  email text,
  tags text[] NOT NULL DEFAULT '{}',
  opt_out boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO anon, authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_default_all ON public.contacts FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ai',
  assigned_to text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO anon, authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversations_default_all ON public.conversations FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction text NOT NULL,
  content text,
  media_url text,
  media_type text,
  status text NOT NULL DEFAULT 'sent',
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_default_all ON public.messages FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

-- 6. templates
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  content text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO anon, authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_default_all ON public.templates FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. spreadsheets
CREATE TABLE public.spreadsheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  headers text[] NOT NULL DEFAULT '{}',
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spreadsheets TO anon, authenticated;
GRANT ALL ON public.spreadsheets TO service_role;
ALTER TABLE public.spreadsheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY spreadsheets_default_all ON public.spreadsheets FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_spreadsheets_updated_at BEFORE UPDATE ON public.spreadsheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. spreadsheet_rows
CREATE TABLE public.spreadsheet_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  spreadsheet_id uuid NOT NULL REFERENCES public.spreadsheets(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spreadsheet_rows TO anon, authenticated;
GRANT ALL ON public.spreadsheet_rows TO service_role;
ALTER TABLE public.spreadsheet_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY spreadsheet_rows_default_all ON public.spreadsheet_rows FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_spreadsheet_rows_updated_at BEFORE UPDATE ON public.spreadsheet_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_spreadsheet_rows_sheet ON public.spreadsheet_rows(spreadsheet_id, row_index);

-- 9. campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  spreadsheet_id uuid REFERENCES public.spreadsheets(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  schedule_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  throttle_ms integer NOT NULL DEFAULT 3000,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO anon, authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_default_all ON public.campaigns FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. campaign_recipients
CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.default_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_phone text NOT NULL,
  contact_name text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO anon, authenticated;
GRANT ALL ON public.campaign_recipients TO service_role;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_recipients_default_all ON public.campaign_recipients FOR ALL TO anon, authenticated
  USING (workspace_id = public.default_workspace_id())
  WITH CHECK (workspace_id = public.default_workspace_id());
CREATE TRIGGER trg_campaign_recipients_updated_at BEFORE UPDATE ON public.campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id, status);
