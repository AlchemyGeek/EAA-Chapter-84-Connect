
CREATE OR REPLACE FUNCTION public.create_prospect_from_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _next_key_id integer;
BEGIN
  -- Get next available key_id
  SELECT COALESCE(MAX(key_id), 0) + 1 INTO _next_key_id FROM roster_members;

  INSERT INTO roster_members (
    key_id,
    first_name,
    last_name,
    eaa_number,
    email,
    street_address_1,
    preferred_city,
    preferred_state,
    zip_code,
    member_type,
    current_standing,
    current_joined_on_date,
    expiration_date
  ) VALUES (
    _next_key_id,
    NEW.first_name,
    NEW.last_name,
    NEW.eaa_number,
    NEW.email,
    NEW.address,
    NEW.city,
    NEW.state,
    NEW.zip_code,
    'Prospect',
    'Active',
    CURRENT_DATE,
    CURRENT_DATE
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_prospect_on_application
  AFTER INSERT ON public.new_member_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_prospect_from_application();
