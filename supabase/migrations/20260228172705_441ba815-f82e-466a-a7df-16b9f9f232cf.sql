-- Allow authenticated users to update their own roster record (matched by email)
-- Only permit updating contact and aviation fields
CREATE POLICY "Members can update own contact and aviation fields"
ON public.roster_members
FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
