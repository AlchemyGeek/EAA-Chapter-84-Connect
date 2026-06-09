DROP TABLE IF EXISTS public.hangar_talk_reactions CASCADE;
DROP TABLE IF EXISTS public.hangar_talk_attachments CASCADE;
DROP TABLE IF EXISTS public.hangar_talk_messages CASCADE;

DROP POLICY IF EXISTS "Active members can read hangar-talk objects" ON storage.objects;
DROP POLICY IF EXISTS "Active members can upload hangar-talk objects" ON storage.objects;
DROP POLICY IF EXISTS "Active members can delete own hangar-talk objects" ON storage.objects;
DROP POLICY IF EXISTS "Active members can update own hangar-talk objects" ON storage.objects;