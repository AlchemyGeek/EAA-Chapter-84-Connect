-- Fix: restrict roster_member_snapshots SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view snapshots" ON public.roster_member_snapshots;

CREATE POLICY "Admins can view snapshots"
  ON public.roster_member_snapshots
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));