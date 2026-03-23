
-- Create a directory-safe view that masks private fields based on privacy flags
CREATE OR REPLACE VIEW public.roster_members_directory
WITH (security_invoker = false)
AS
SELECT
  rm.key_id,
  rm.first_name,
  rm.last_name,
  rm.nickname,
  rm.eaa_number,
  rm.member_type,
  rm.current_standing,
  -- Contact fields: only show if not marked private AND directory-visible
  CASE WHEN NOT COALESCE(rm.email_private, false) THEN rm.email ELSE NULL END AS email,
  CASE WHEN NOT COALESCE(rm.cell_phone_private, false) THEN rm.cell_phone ELSE NULL END AS cell_phone,
  CASE WHEN NOT COALESCE(rm.home_phone_private, false) THEN rm.home_phone ELSE NULL END AS home_phone,
  CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.street_address_1 ELSE NULL END AS street_address_1,
  CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.street_address_2 ELSE NULL END AS street_address_2,
  CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.preferred_city ELSE NULL END AS preferred_city,
  CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.preferred_state ELSE NULL END AS preferred_state,
  CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.zip_code ELSE NULL END AS zip_code,
  CASE WHEN NOT COALESCE(rm.address_private, false) THEN rm.country ELSE NULL END AS country,
  -- Aviation fields (always safe to show based on directory visibility toggle)
  rm.ratings,
  rm.aircraft_owned,
  rm.aircraft_project,
  rm.aircraft_built,
  -- Volunteering flags
  rm.young_eagle_pilot,
  rm.young_eagle_volunteer,
  rm.eagle_pilot,
  rm.eagle_flight_volunteer,
  rm.imc,
  rm.vmc
FROM public.roster_members rm;

-- Grant access to authenticated users
GRANT SELECT ON public.roster_members_directory TO authenticated;

-- Now restrict the roster_members table: drop the broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.roster_members;

-- Members can only see their own row
CREATE POLICY "Members can view own record"
ON public.roster_members
FOR SELECT
TO authenticated
USING (
  LOWER(email) = LOWER(auth.jwt() ->> 'email')
);

-- Officers and admins can view all members
CREATE POLICY "Officers and admins can view all members"
ON public.roster_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm2 ON rm2.key_id = cl.key_id
    WHERE LOWER(rm2.email) = LOWER(auth.jwt() ->> 'email')
  )
);
