
DROP POLICY IF EXISTS "Authors manage own post tags insert" ON public.hangar_talk_post_tags;
CREATE POLICY "Authors or admins insert post tags"
  ON public.hangar_talk_post_tags FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.hangar_talk_posts p
      WHERE p.id = post_id AND is_roster_self(p.author_key_id)
    )
  );

DROP POLICY IF EXISTS "Authors manage own post tags delete" ON public.hangar_talk_post_tags;
CREATE POLICY "Authors or admins delete post tags"
  ON public.hangar_talk_post_tags FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.hangar_talk_posts p
      WHERE p.id = post_id AND is_roster_self(p.author_key_id)
    )
  );
