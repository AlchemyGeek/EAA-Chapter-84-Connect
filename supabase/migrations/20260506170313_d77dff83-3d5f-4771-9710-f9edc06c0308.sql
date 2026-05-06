
CREATE TABLE public.proxy_votes_2026 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id integer NOT NULL,
  member_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('signed','revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proxy_votes_2026_key_id ON public.proxy_votes_2026(key_id, created_at DESC);

ALTER TABLE public.proxy_votes_2026 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can insert own proxy votes"
ON public.proxy_votes_2026 FOR INSERT TO authenticated
WITH CHECK (key_id IN (
  SELECT rm.key_id FROM roster_members rm
  WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
    AND rm.current_standing = 'Active'
));

CREATE POLICY "Members can view own proxy votes"
ON public.proxy_votes_2026 FOR SELECT TO authenticated
USING (key_id IN (
  SELECT rm.key_id FROM roster_members rm
  WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
));

CREATE POLICY "Officers and admins can view all proxy votes"
ON public.proxy_votes_2026 FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email')));
