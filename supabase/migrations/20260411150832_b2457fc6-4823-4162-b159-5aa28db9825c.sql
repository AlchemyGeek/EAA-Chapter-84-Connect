
-- 1. Fix member-images storage: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Anyone can view member images" ON storage.objects;

CREATE POLICY "Authenticated users can view member images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'member-images');

-- 2. Fix hangar-talk storage: replace public SELECT with authenticated active members
DROP POLICY IF EXISTS "Anyone can read chat files" ON storage.objects;

CREATE POLICY "Active members can read chat files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'hangar-talk'
  AND EXISTS (
    SELECT 1 FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
      AND rm.current_standing = 'Active'
  )
);

-- 3. Fix member_chapter_data: restrict member UPDATE to visibility columns only
-- Drop the existing overly permissive member update policy
DROP POLICY IF EXISTS "Members can update own chapter data visibility" ON member_chapter_data;

-- Recreate with column restriction via a trigger that prevents non-visibility column changes
CREATE OR REPLACE FUNCTION public.restrict_member_chapter_data_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_email text;
  _is_admin boolean;
  _is_officer boolean;
BEGIN
  _caller_email := (current_setting('request.jwt.claims', true)::json->>'email');
  _is_admin := has_role(auth.uid(), 'admin');
  _is_officer := is_officer(_caller_email);
  
  -- Admins and officers can update any field
  IF _is_admin OR _is_officer THEN
    RETURN NEW;
  END IF;
  
  -- Regular members: only allow visibility column changes
  IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
    OR NEW.volunteer_notes IS DISTINCT FROM OLD.volunteer_notes
    OR NEW.application_status IS DISTINCT FROM OLD.application_status
    OR NEW.chapter_payment_notes IS DISTINCT FROM OLD.chapter_payment_notes
    OR NEW.chapter_payment_method IS DISTINCT FROM OLD.chapter_payment_method
    OR NEW.pending_roster_update IS DISTINCT FROM OLD.pending_roster_update
  THEN
    RAISE EXCEPTION 'Members can only update directory visibility settings';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_member_chapter_data_update
BEFORE UPDATE ON member_chapter_data
FOR EACH ROW
EXECUTE FUNCTION restrict_member_chapter_data_update();

-- Re-create the member update policy (same scope, trigger enforces column restriction)
CREATE POLICY "Members can update own chapter data visibility"
ON member_chapter_data
FOR UPDATE
TO authenticated
USING (
  key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
  )
)
WITH CHECK (
  key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
  )
);
