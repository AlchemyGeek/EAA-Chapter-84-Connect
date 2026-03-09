
-- Add new columns to new_member_applications
ALTER TABLE public.new_member_applications
  ADD COLUMN eaa_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN fees_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN processed boolean NOT NULL DEFAULT false,
  ADD COLUMN processed_at timestamptz,
  ADD COLUMN roster_key_id integer;

-- Update the trigger function to store roster_key_id back into the application
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
    member_type, current_standing, current_joined_on_date, expiration_date
  ) VALUES (
    _next_key_id, NEW.first_name, NEW.last_name, NEW.eaa_number, NEW.email,
    NEW.address, NEW.city, NEW.state, NEW.zip_code,
    'Prospect', 'Active', CURRENT_DATE, CURRENT_DATE
  );

  NEW.roster_key_id := _next_key_id;
  RETURN NEW;
END;
$$;

-- Recreate trigger as BEFORE INSERT so we can modify NEW
DROP TRIGGER IF EXISTS trg_create_prospect_on_application ON public.new_member_applications;
CREATE TRIGGER trg_create_prospect_on_application
  BEFORE INSERT ON public.new_member_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_prospect_from_application();

-- Add SELECT and UPDATE policy for officers on new_member_applications
CREATE POLICY "Officers can view applications"
  ON public.new_member_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Officers can update applications"
  ON public.new_member_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email')
    )
  );
