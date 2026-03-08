CREATE OR REPLACE FUNCTION public.get_user_emails_by_ids(_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email::text FROM auth.users WHERE id = ANY(_user_ids);
$$;