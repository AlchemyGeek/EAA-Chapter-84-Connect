CREATE OR REPLACE FUNCTION public.create_prospect_from_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _next_key_id integer;
BEGIN
  SELECT COALESCE(MAX(key_id), 0) + 1 INTO _next_key_id FROM roster_members;

  INSERT INTO roster_members (
    key_id, first_name, last_name, eaa_number, email,
    street_address_1, preferred_city, preferred_state, zip_code,
    member_type, current_standing, current_joined_on_date, expiration_date,
    date_added
  ) VALUES (
    _next_key_id, NEW.first_name, NEW.last_name, NEW.eaa_number, NEW.email,
    NEW.address, NEW.city, NEW.state, NEW.zip_code,
    'Prospect', 'Active', CURRENT_DATE, CURRENT_DATE,
    (NEW.created_at AT TIME ZONE 'UTC')::date
  );

  NEW.roster_key_id := _next_key_id;
  RETURN NEW;
END;
$$;