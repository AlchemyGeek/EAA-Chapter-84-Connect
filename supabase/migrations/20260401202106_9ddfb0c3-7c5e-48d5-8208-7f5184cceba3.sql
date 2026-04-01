-- Fix: volunteering_applications SELECT policy is too broad
-- Drop the overly permissive policy
DROP POLICY "Authenticated users can view applications" ON volunteering_applications;

-- Members can only view their own applications
CREATE POLICY "Members can view own applications"
  ON volunteering_applications FOR SELECT
  TO authenticated
  USING (
    key_id IN (
      SELECT rm.key_id FROM roster_members rm
      WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Officers and admins can view all applications
CREATE POLICY "Officers and admins can view all applications"
  ON volunteering_applications FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_officer(auth.jwt() ->> 'email')
  );