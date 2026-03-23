-- Drop the overly broad member self-update policy
DROP POLICY IF EXISTS "Members can update own contact and aviation fields" ON public.roster_members;

-- Create a security definer function that only allows updating safe columns
CREATE OR REPLACE FUNCTION public.member_update_own_record(
  _key_id integer,
  _email text DEFAULT NULL,
  _cell_phone text DEFAULT NULL,
  _home_phone text DEFAULT NULL,
  _street_address_1 text DEFAULT NULL,
  _street_address_2 text DEFAULT NULL,
  _preferred_city text DEFAULT NULL,
  _preferred_state text DEFAULT NULL,
  _zip_code text DEFAULT NULL,
  _country text DEFAULT NULL,
  _nickname text DEFAULT NULL,
  _spouse text DEFAULT NULL,
  _ratings text DEFAULT NULL,
  _aircraft_owned text DEFAULT NULL,
  _aircraft_project text DEFAULT NULL,
  _aircraft_built text DEFAULT NULL,
  _other_info text DEFAULT NULL,
  _cell_phone_private boolean DEFAULT NULL,
  _home_phone_private boolean DEFAULT NULL,
  _address_private boolean DEFAULT NULL,
  _email_private boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_email text;
  _member_email text;
BEGIN
  _caller_email := (current_setting('request.jwt.claims', true)::json->>'email');
  
  -- Get member's email to verify ownership
  SELECT rm.email INTO _member_email FROM roster_members rm WHERE rm.key_id = _key_id;
  
  IF _member_email IS NULL OR LOWER(_member_email) != LOWER(_caller_email) THEN
    RAISE EXCEPTION 'You can only update your own record';
  END IF;
  
  UPDATE roster_members SET
    email = COALESCE(_email, email),
    cell_phone = COALESCE(_cell_phone, cell_phone),
    home_phone = COALESCE(_home_phone, home_phone),
    street_address_1 = COALESCE(_street_address_1, street_address_1),
    street_address_2 = COALESCE(_street_address_2, street_address_2),
    preferred_city = COALESCE(_preferred_city, preferred_city),
    preferred_state = COALESCE(_preferred_state, preferred_state),
    zip_code = COALESCE(_zip_code, zip_code),
    country = COALESCE(_country, country),
    nickname = COALESCE(_nickname, nickname),
    spouse = COALESCE(_spouse, spouse),
    ratings = COALESCE(_ratings, ratings),
    aircraft_owned = COALESCE(_aircraft_owned, aircraft_owned),
    aircraft_project = COALESCE(_aircraft_project, aircraft_project),
    aircraft_built = COALESCE(_aircraft_built, aircraft_built),
    other_info = COALESCE(_other_info, other_info),
    cell_phone_private = COALESCE(_cell_phone_private, cell_phone_private),
    home_phone_private = COALESCE(_home_phone_private, home_phone_private),
    address_private = COALESCE(_address_private, address_private),
    email_private = COALESCE(_email_private, email_private),
    updated_at = now()
  WHERE key_id = _key_id;
END;
$$;