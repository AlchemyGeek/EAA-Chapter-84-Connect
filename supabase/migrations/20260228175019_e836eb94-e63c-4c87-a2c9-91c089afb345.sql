
-- Add visible_in_directory to chapter-specific data (not roster data)
ALTER TABLE public.member_chapter_data
ADD COLUMN visible_in_directory boolean NOT NULL DEFAULT true;

-- Allow members to update their own chapter data (visibility toggle)
CREATE POLICY "Members can update own chapter data visibility"
ON public.member_chapter_data
FOR UPDATE
USING (
  key_id IN (
    SELECT rm.key_id FROM public.roster_members rm
    WHERE rm.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text
  )
)
WITH CHECK (
  key_id IN (
    SELECT rm.key_id FROM public.roster_members rm
    WHERE rm.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text
  )
);

-- Allow members to insert their own chapter data row if it doesn't exist
CREATE POLICY "Members can insert own chapter data"
ON public.member_chapter_data
FOR INSERT
WITH CHECK (
  key_id IN (
    SELECT rm.key_id FROM public.roster_members rm
    WHERE rm.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text
  )
);
