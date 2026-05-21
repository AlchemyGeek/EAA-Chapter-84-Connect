
CREATE OR REPLACE FUNCTION public.promote_pending_roles(_user_id uuid, _email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Caller identity guards: prevent any authenticated user from claiming
  -- pending roles intended for a different account.
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;
  IF LOWER(COALESCE(auth.jwt() ->> 'email', '')) IS DISTINCT FROM LOWER(COALESCE(_email, '')) THEN
    RAISE EXCEPTION 'Email mismatch';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  SELECT _user_id, pr.role
  FROM public.pending_user_roles pr
  WHERE LOWER(pr.email) = LOWER(_email)
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.pending_user_roles
  WHERE LOWER(email) = LOWER(_email);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.promote_pending_roles(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_pending_roles(uuid, text) TO authenticated;
