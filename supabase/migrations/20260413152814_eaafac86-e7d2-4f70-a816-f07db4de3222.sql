
-- 1. Change default to false
ALTER TABLE public.member_chapter_data
  ALTER COLUMN contact_visible_in_directory SET DEFAULT false;

-- 2. Reset all existing rows to false
UPDATE public.member_chapter_data
  SET contact_visible_in_directory = false;

-- 3. Update get_directory_members to always show email (regardless of contact visibility)
CREATE OR REPLACE FUNCTION public.get_directory_members()
 RETURNS TABLE(key_id integer, first_name text, last_name text, nickname text, eaa_number text, member_type text, current_standing text, email text, cell_phone text, home_phone text, street_address_1 text, street_address_2 text, preferred_city text, preferred_state text, zip_code text, country text, ratings text, aircraft_owned text, aircraft_project text, aircraft_built text, young_eagle_pilot boolean, young_eagle_volunteer boolean, eagle_pilot boolean, eagle_flight_volunteer boolean, imc boolean, vmc boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    rm.key_id,
    rm.first_name,
    rm.last_name,
    rm.nickname,
    rm.eaa_number,
    rm.member_type,
    rm.current_standing,
    -- Email is ALWAYS visible in directory (not gated by email_private)
    rm.email,
    CASE WHEN NOT COALESCE(rm.cell_phone_private, false) THEN rm.cell_phone ELSE NULL END,
    CASE WHEN NOT COALESCE(rm.home_phone_private, false) THEN rm.home_phone ELSE NULL END,
    CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.street_address_1 ELSE NULL END,
    CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.street_address_2 ELSE NULL END,
    CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.preferred_city ELSE NULL END,
    CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.preferred_state ELSE NULL END,
    CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.zip_code ELSE NULL END,
    CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.country ELSE NULL END,
    rm.ratings,
    rm.aircraft_owned,
    rm.aircraft_project,
    rm.aircraft_built,
    rm.young_eagle_pilot,
    rm.young_eagle_volunteer,
    rm.eagle_pilot,
    rm.eagle_flight_volunteer,
    rm.imc,
    rm.vmc
  FROM roster_members rm
  WHERE rm.current_standing = 'Active'
  ORDER BY rm.last_name;
$$;
