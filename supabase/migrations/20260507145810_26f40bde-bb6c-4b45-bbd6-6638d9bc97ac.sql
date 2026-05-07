-- Fix 1: Attach trigger to enforce member_chapter_data update restrictions
DROP TRIGGER IF EXISTS restrict_member_chapter_data_update_trigger ON public.member_chapter_data;
CREATE TRIGGER restrict_member_chapter_data_update_trigger
  BEFORE UPDATE ON public.member_chapter_data
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_member_chapter_data_update();

-- Fix 2: Make hangar-talk bucket private (Hangar Talk is currently disabled)
UPDATE storage.buckets SET public = false WHERE id = 'hangar-talk';

-- Add RLS policy so active members can still read attachments via signed URLs
DROP POLICY IF EXISTS "Active members can read hangar-talk objects" ON storage.objects;
CREATE POLICY "Active members can read hangar-talk objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'hangar-talk'
    AND EXISTS (
      SELECT 1 FROM public.roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );