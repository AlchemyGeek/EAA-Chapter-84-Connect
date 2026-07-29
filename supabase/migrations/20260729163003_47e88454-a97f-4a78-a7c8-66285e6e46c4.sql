-- hangar_talk_post_tags
DROP POLICY "Active members view post tags" ON public.hangar_talk_post_tags;
CREATE POLICY "Active members view post tags" ON public.hangar_talk_post_tags
FOR SELECT TO authenticated
USING (is_active_member() OR has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email'::text)));

DROP POLICY "Authors or admins insert post tags" ON public.hangar_talk_post_tags;
CREATE POLICY "Authors or admins insert post tags" ON public.hangar_talk_post_tags
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR (EXISTS (
  SELECT 1 FROM hangar_talk_posts p
  WHERE p.id = hangar_talk_post_tags.post_id AND is_roster_self(p.author_key_id))));

DROP POLICY "Authors or admins delete post tags" ON public.hangar_talk_post_tags;
CREATE POLICY "Authors or admins delete post tags" ON public.hangar_talk_post_tags
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR (EXISTS (
  SELECT 1 FROM hangar_talk_posts p
  WHERE p.id = hangar_talk_post_tags.post_id AND is_roster_self(p.author_key_id))));

-- posts / replies delete
DROP POLICY "Authors delete own posts" ON public.hangar_talk_posts;
CREATE POLICY "Authors delete own posts" ON public.hangar_talk_posts
FOR DELETE TO authenticated USING (is_roster_self(author_key_id));

DROP POLICY "Authors delete own replies" ON public.hangar_talk_replies;
CREATE POLICY "Authors delete own replies" ON public.hangar_talk_replies
FOR DELETE TO authenticated USING (is_roster_self(author_key_id));

-- member_images admin
DROP POLICY "Admins can manage all images" ON public.member_images;
CREATE POLICY "Admins can manage all images" ON public.member_images
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- storage member-images
DROP POLICY "Active members can view member images" ON storage.objects;
CREATE POLICY "Active members can view member images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'member-images' AND (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_officer((auth.jwt() ->> 'email'::text))
  OR EXISTS (SELECT 1 FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text)) AND rm.current_standing = 'Active')));

DROP POLICY "Members can upload own images" ON storage.objects;
CREATE POLICY "Members can upload own images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'member-images' AND (storage.foldername(name))[1] IN (
  SELECT rm.key_id::text FROM roster_members rm
  WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))));

DROP POLICY "Members can delete own images" ON storage.objects;
CREATE POLICY "Members can delete own images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'member-images' AND (storage.foldername(name))[1] IN (
  SELECT rm.key_id::text FROM roster_members rm
  WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))));