
-- Fix member_chapter_data policies that reference roster_members
DROP POLICY IF EXISTS "Members can insert own chapter data" ON public.member_chapter_data;
CREATE POLICY "Members can insert own chapter data"
  ON public.member_chapter_data FOR INSERT TO authenticated
  WITH CHECK (key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS "Members can update own chapter data visibility" ON public.member_chapter_data;
CREATE POLICY "Members can update own chapter data visibility"
  ON public.member_chapter_data FOR UPDATE TO authenticated
  USING (key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
  ))
  WITH CHECK (key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
  ));

-- Fix member_images policies that reference roster_members
DROP POLICY IF EXISTS "Members can insert own images" ON public.member_images;
CREATE POLICY "Members can insert own images"
  ON public.member_images FOR INSERT TO authenticated
  WITH CHECK (key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS "Members can update own images" ON public.member_images;
CREATE POLICY "Members can update own images"
  ON public.member_images FOR UPDATE TO authenticated
  USING (key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
  ))
  WITH CHECK (key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS "Members can delete own images" ON public.member_images;
CREATE POLICY "Members can delete own images"
  ON public.member_images FOR DELETE TO authenticated
  USING (key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
  ));

-- Fix volunteering_applications INSERT policy
DROP POLICY IF EXISTS "Members can insert own applications" ON public.volunteering_applications;
CREATE POLICY "Members can insert own applications"
  ON public.volunteering_applications FOR INSERT TO authenticated
  WITH CHECK (key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')
  ));
