
DROP POLICY IF EXISTS "Authors or admins delete posts" ON public.hangar_talk_posts;
CREATE POLICY "Authors delete own posts"
  ON public.hangar_talk_posts FOR DELETE
  USING (is_roster_self(author_key_id));

DROP POLICY IF EXISTS "Authors or admins delete replies" ON public.hangar_talk_replies;
CREATE POLICY "Authors delete own replies"
  ON public.hangar_talk_replies FOR DELETE
  USING (is_roster_self(author_key_id));
