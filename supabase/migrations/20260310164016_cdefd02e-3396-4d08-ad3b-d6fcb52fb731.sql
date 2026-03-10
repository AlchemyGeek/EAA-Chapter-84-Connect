CREATE OR REPLACE FUNCTION public.check_email_in_roster(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.roster_members
    WHERE LOWER(email) = LOWER(_email)
  )
$$;