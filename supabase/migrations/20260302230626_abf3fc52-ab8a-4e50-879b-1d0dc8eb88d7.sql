
-- Drop the broken policy
DROP POLICY "Members can update own contact and aviation fields" ON public.roster_members;

-- Recreate using auth.jwt() which doesn't require access to auth.users table
CREATE POLICY "Members can update own contact and aviation fields"
ON public.roster_members
FOR UPDATE
USING (email = (auth.jwt() ->> 'email'))
WITH CHECK (email = (auth.jwt() ->> 'email'));
