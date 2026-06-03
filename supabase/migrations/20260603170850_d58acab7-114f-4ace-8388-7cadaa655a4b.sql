CREATE OR REPLACE FUNCTION public.officer_email_audience_missing_count(_audience text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_email text;
  _count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  _caller_email := (auth.jwt() ->> 'email');
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR is_officer(_caller_email)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _audience = 'active_all' THEN
    SELECT COUNT(*) INTO _count FROM roster_members rm
    WHERE rm.current_standing = 'Active'
      AND (rm.email IS NULL OR trim(rm.email) = '');
  ELSIF _audience = 'active_overdue' THEN
    SELECT COUNT(*) INTO _count FROM roster_members rm
    WHERE rm.current_standing = 'Active'
      AND rm.expiration_date IS NOT NULL
      AND rm.expiration_date < CURRENT_DATE
      AND (rm.email IS NULL OR trim(rm.email) = '');
  ELSIF _audience = 'active_good' THEN
    SELECT COUNT(*) INTO _count FROM roster_members rm
    WHERE rm.current_standing = 'Active'
      AND (rm.expiration_date IS NULL OR rm.expiration_date >= CURRENT_DATE)
      AND (rm.email IS NULL OR trim(rm.email) = '');
  ELSIF _audience = 'inactive' THEN
    SELECT COUNT(*) INTO _count FROM roster_members rm
    WHERE (rm.current_standing IS DISTINCT FROM 'Active')
      AND (rm.email IS NULL OR trim(rm.email) = '');
  ELSIF _audience = 'active_good_unsigned_proxy_2026' THEN
    WITH latest AS (
      SELECT DISTINCT ON (key_id) key_id, action
      FROM proxy_votes_2026
      ORDER BY key_id, created_at DESC
    )
    SELECT COUNT(*) INTO _count
    FROM roster_members rm
    LEFT JOIN latest l ON l.key_id = rm.key_id
    WHERE rm.current_standing = 'Active'
      AND (rm.expiration_date IS NULL OR rm.expiration_date >= CURRENT_DATE)
      AND (rm.email IS NULL OR trim(rm.email) = '')
      AND (l.action IS NULL OR l.action <> 'signed');
  ELSE
    RAISE EXCEPTION 'Unknown audience: %', _audience;
  END IF;

  RETURN COALESCE(_count, 0);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.officer_email_audience_missing_count(text) TO authenticated;