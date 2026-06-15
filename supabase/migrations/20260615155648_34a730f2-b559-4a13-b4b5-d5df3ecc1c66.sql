
CREATE OR REPLACE FUNCTION public.get_roster_display_names(_key_ids integer[])
RETURNS TABLE(key_id integer, first_name text, last_name text, nickname text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF NOT (
    public.is_active_member()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_officer(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT rm.key_id, rm.first_name, rm.last_name, rm.nickname
    FROM public.roster_members rm
    WHERE rm.key_id = ANY(_key_ids);
END;
$$;
