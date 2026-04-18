
-- Fix 1: Restrict member updates on member_chapter_data to visibility-only fields.
-- The restrict_member_chapter_data_update() function already exists; attach as trigger.
DROP TRIGGER IF EXISTS restrict_member_chapter_data_update_trg ON public.member_chapter_data;
CREATE TRIGGER restrict_member_chapter_data_update_trg
BEFORE UPDATE ON public.member_chapter_data
FOR EACH ROW
EXECUTE FUNCTION public.restrict_member_chapter_data_update();

-- Fix 2: Add UPDATE storage policy for hangar-talk bucket scoped to file owner.
CREATE POLICY "Members can update own chat uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'hangar-talk' AND owner = auth.uid())
WITH CHECK (bucket_id = 'hangar-talk' AND owner = auth.uid());

-- Fix 3: Restrict Realtime channel subscriptions to active members only.
-- Enable RLS on realtime.messages and add a policy gating broadcast/postgres_changes.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active members can receive realtime broadcasts" ON realtime.messages;
CREATE POLICY "Active members can receive realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_officer((auth.jwt() ->> 'email'))
  OR EXISTS (
    SELECT 1 FROM public.roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
      AND rm.current_standing = 'Active'
  )
);
