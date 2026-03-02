
-- Store a snapshot of each member's roster data at import time
CREATE TABLE public.roster_member_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.roster_imports(id) ON DELETE CASCADE,
  key_id integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(import_id, key_id)
);

-- Enable RLS
ALTER TABLE public.roster_member_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can insert snapshots (via edge function with service role)
CREATE POLICY "Admins can insert snapshots"
ON public.roster_member_snapshots
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view snapshots
CREATE POLICY "Authenticated users can view snapshots"
ON public.roster_member_snapshots
FOR SELECT
USING (true);

-- Admins can delete snapshots
CREATE POLICY "Admins can delete snapshots"
ON public.roster_member_snapshots
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for efficient lookups
CREATE INDEX idx_snapshots_import_id ON public.roster_member_snapshots(import_id);
CREATE INDEX idx_snapshots_key_id ON public.roster_member_snapshots(key_id);
