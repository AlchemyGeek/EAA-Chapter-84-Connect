DROP POLICY IF EXISTS "Members can upload to own classified folder" ON storage.objects;

CREATE POLICY "Author or officer/admin can upload classified photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'classifieds'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_officer((auth.jwt() ->> 'email'::text))
    OR (storage.foldername(name))[1] IN (
      SELECT (rm.key_id)::text
      FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
        AND rm.current_standing = 'Active'
    )
  )
);