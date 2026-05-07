-- Tighten member-images SELECT policy: only active members, officers, or admins
DROP POLICY IF EXISTS "Authenticated users can view member images" ON storage.objects;

CREATE POLICY "Active members can view member images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'member-images'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_officer((auth.jwt() ->> 'email'::text))
    OR EXISTS (
      SELECT 1 FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
        AND rm.current_standing = 'Active'
    )
  )
);

-- Normalize case-sensitive comparisons in member-images upload/delete policies
DROP POLICY IF EXISTS "Members can upload own images" ON storage.objects;
CREATE POLICY "Members can upload own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'member-images'
  AND (storage.foldername(name))[1] IN (
    SELECT (rm.key_id)::text FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
  )
);

DROP POLICY IF EXISTS "Members can delete own images" ON storage.objects;
CREATE POLICY "Members can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'member-images'
  AND (storage.foldername(name))[1] IN (
    SELECT (rm.key_id)::text FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
  )
);