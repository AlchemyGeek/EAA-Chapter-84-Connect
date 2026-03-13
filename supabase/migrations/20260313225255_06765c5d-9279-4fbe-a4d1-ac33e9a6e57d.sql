
CREATE OR REPLACE FUNCTION public.check_email_and_eaa_in_roster(_email text, _eaa_number text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.roster_members
    WHERE LOWER(email) = LOWER(_email)
      AND LOWER(eaa_number) = LOWER(_eaa_number)
  )
$$;
