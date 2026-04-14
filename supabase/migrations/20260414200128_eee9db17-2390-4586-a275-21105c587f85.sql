
-- Add member-scoped UPDATE policy for member-images storage bucket
CREATE POLICY "Members can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-images'
  AND (storage.foldername(name))[1] IN (
    SELECT rm.key_id::text FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
  )
)
WITH CHECK (
  bucket_id = 'member-images'
  AND (storage.foldername(name))[1] IN (
    SELECT rm.key_id::text FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
  )
);

-- Add member-scoped DELETE policy for hangar-talk storage bucket
CREATE POLICY "Members can delete own chat uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hangar-talk'
  AND (storage.foldername(name))[1] IN (
    SELECT rm.key_id::text FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
    AND rm.current_standing = 'Active'
  )
);
