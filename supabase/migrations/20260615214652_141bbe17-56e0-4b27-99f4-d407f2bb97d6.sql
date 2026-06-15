
-- Allow admins to insert posts/replies as any roster member (for impersonation testing)
DROP POLICY IF EXISTS "Active members create own posts" ON public.hangar_talk_posts;
CREATE POLICY "Active members create own posts"
  ON public.hangar_talk_posts FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_active_member() AND public.is_roster_self(author_key_id))
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Active members create own replies" ON public.hangar_talk_replies;
CREATE POLICY "Active members create own replies"
  ON public.hangar_talk_replies FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_active_member() AND public.is_roster_self(author_key_id))
    OR public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to upload Hangar Talk files even if their own roster standing isn't Active.
-- Path still must start with their own auth.uid (enforced below).
DROP POLICY IF EXISTS "Active members upload own hangar-talk files" ON storage.objects;
CREATE POLICY "Active members upload own hangar-talk files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hangar-talk'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (public.is_active_member() OR public.has_role(auth.uid(), 'admin'))
  );
