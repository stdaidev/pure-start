ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS ignore_groups boolean NOT NULL DEFAULT true;