-- Add admin/officer guard to user lookup functions
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _result uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email'))) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT id INTO _result FROM auth.users WHERE email = _email LIMIT 1;
  RETURN _result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_emails_by_ids(_user_ids uuid[])
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email'))) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT u.id, u.email::text FROM auth.users u WHERE u.id = ANY(_user_ids);
END;
$function$;

-- Require authenticated caller for directory function
CREATE OR REPLACE FUNCTION public.get_directory_members()
 RETURNS TABLE(key_id integer, first_name text, last_name text, nickname text, eaa_number text, member_type text, current_standing text, email text, cell_phone text, home_phone text, street_address_1 text, street_address_2 text, preferred_city text, preferred_state text, zip_code text, country text, ratings text, aircraft_owned text, aircraft_project text, aircraft_built text, young_eagle_pilot boolean, young_eagle_volunteer boolean, eagle_pilot boolean, eagle_flight_volunteer boolean, imc boolean, vmc boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT
    rm.key_id, rm.first_name, rm.last_name, rm.nickname, rm.eaa_number,
    rm.member_type, rm.current_standing, rm.email,
    CASE WHEN COALESCE(mcd.contact_visible_in_directory, false) AND NOT COALESCE(rm.cell_phone_private, false) THEN rm.cell_phone ELSE NULL END,
    CASE WHEN COALESCE(mcd.contact_visible_in_directory, false) AND NOT COALESCE(rm.home_phone_private, false) THEN rm.home_phone ELSE NULL END,
    CASE WHEN COALESCE(mcd.contact_visible_in_directory, false) AND NOT COALESCE(rm.address_private, false) THEN rm.street_address_1 ELSE NULL END,
    CASE WHEN COALESCE(mcd.contact_visible_in_directory, false) AND NOT COALESCE(rm.address_private, false) THEN rm.street_address_2 ELSE NULL END,
    CASE WHEN COALESCE(mcd.contact_visible_in_directory, false) AND NOT COALESCE(rm.address_private, false) THEN rm.preferred_city ELSE NULL END,
    CASE WHEN COALESCE(mcd.contact_visible_in_directory, false) AND NOT COALESCE(rm.address_private, false) THEN rm.preferred_state ELSE NULL END,
    CASE WHEN COALESCE(mcd.contact_visible_in_directory, false) AND NOT COALESCE(rm.address_private, false) THEN rm.zip_code ELSE NULL END,
    CASE WHEN COALESCE(mcd.contact_visible_in_directory, false) AND NOT COALESCE(rm.address_private, false) THEN rm.country ELSE NULL END,
    rm.ratings, rm.aircraft_owned, rm.aircraft_project, rm.aircraft_built,
    rm.young_eagle_pilot, rm.young_eagle_volunteer, rm.eagle_pilot, rm.eagle_flight_volunteer,
    rm.imc, rm.vmc
  FROM roster_members rm
  LEFT JOIN member_chapter_data mcd ON mcd.key_id = rm.key_id
  WHERE rm.current_standing = 'Active'
  ORDER BY rm.last_name;
END;
$function$;

-- Revoke public execute on sensitive functions
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_emails_by_ids(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_directory_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_emails_by_ids(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_directory_members() TO authenticated;