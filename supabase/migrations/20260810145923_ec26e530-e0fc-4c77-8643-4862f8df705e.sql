DROP POLICY IF EXISTS "Authenticated can view classified photos" ON storage.objects;

CREATE POLICY "Authenticated can view classified photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'classifieds'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_officer((auth.jwt() ->> 'email'))
    OR EXISTS (
      SELECT 1 FROM public.classifieds c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND (c.status <> 'hidden'::classified_status OR public.is_classified_author(c.author_key_id))
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can view member images" ON public.member_images;

CREATE POLICY "Active members can view member images"
ON public.member_images
FOR SELECT
TO authenticated
USING (
  public.is_active_member()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_officer((auth.jwt() ->> 'email'))
);