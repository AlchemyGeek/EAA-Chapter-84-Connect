DROP POLICY IF EXISTS "Members can insert own chapter data" ON public.member_chapter_data;

CREATE POLICY "Members can insert own chapter data"
ON public.member_chapter_data
FOR INSERT
TO authenticated
WITH CHECK (
  key_id IN (
    SELECT rm.key_id FROM public.roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_officer((auth.jwt() ->> 'email'))
    OR (
      internal_notes IS NULL
      AND volunteer_notes IS NULL
      AND application_status IS NULL
      AND chapter_payment_notes IS NULL
      AND chapter_payment_method IS NULL
      AND pending_roster_update IS NULL
    )
  )
);