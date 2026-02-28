
-- Drop the broken policies that reference auth.users directly
DROP POLICY IF EXISTS "Members can update own chapter data visibility" ON public.member_chapter_data;
DROP POLICY IF EXISTS "Members can insert own chapter data" ON public.member_chapter_data;

-- Recreate using auth.jwt() which doesn't require access to auth.users
CREATE POLICY "Members can update own chapter data visibility"
ON public.member_chapter_data
FOR UPDATE
USING (
  key_id IN (
    SELECT rm.key_id FROM public.roster_members rm
    WHERE rm.email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  key_id IN (
    SELECT rm.key_id FROM public.roster_members rm
    WHERE rm.email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Members can insert own chapter data"
ON public.member_chapter_data
FOR INSERT
WITH CHECK (
  key_id IN (
    SELECT rm.key_id FROM public.roster_members rm
    WHERE rm.email = (auth.jwt() ->> 'email')
  )
);
