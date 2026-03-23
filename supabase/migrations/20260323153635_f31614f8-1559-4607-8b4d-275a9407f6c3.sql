
-- Create a SECURITY DEFINER function to check if the caller is an officer
-- This avoids the infinite recursion when used in roster_members RLS policies
CREATE OR REPLACE FUNCTION public.is_officer(_user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE lower(rm.email) = lower(_user_email)
  );
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Officers and admins can view all members" ON public.roster_members;

-- Recreate using the non-recursive function
CREATE POLICY "Officers and admins can view all members"
  ON public.roster_members
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_officer(auth.jwt() ->> 'email')
  );
