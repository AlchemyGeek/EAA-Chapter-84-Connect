
-- 1. Messages table
CREATE TABLE public.hangar_talk_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id integer NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hangar_talk_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: active members only
CREATE POLICY "Active members can view messages"
  ON public.hangar_talk_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );

-- INSERT: active members, own key_id
CREATE POLICY "Active members can post messages"
  ON public.hangar_talk_messages FOR INSERT TO authenticated
  WITH CHECK (
    key_id IN (
      SELECT rm.key_id FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );

-- DELETE: admin only
CREATE POLICY "Admins can delete messages"
  ON public.hangar_talk_messages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hangar_talk_messages;

-- 2. Attachments table
CREATE TABLE public.hangar_talk_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.hangar_talk_messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL DEFAULT 0
);

ALTER TABLE public.hangar_talk_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view attachments"
  ON public.hangar_talk_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );

CREATE POLICY "Active members can insert attachments"
  ON public.hangar_talk_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );

CREATE POLICY "Admins can delete attachments"
  ON public.hangar_talk_attachments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 3. Reactions table
CREATE TABLE public.hangar_talk_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.hangar_talk_messages(id) ON DELETE CASCADE,
  key_id integer NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, key_id, emoji)
);

ALTER TABLE public.hangar_talk_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view reactions"
  ON public.hangar_talk_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );

CREATE POLICY "Active members can add reactions"
  ON public.hangar_talk_reactions FOR INSERT TO authenticated
  WITH CHECK (
    key_id IN (
      SELECT rm.key_id FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );

CREATE POLICY "Members can remove own reactions"
  ON public.hangar_talk_reactions FOR DELETE TO authenticated
  USING (
    key_id IN (
      SELECT rm.key_id FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
    )
  );

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.hangar_talk_reactions;

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('hangar-talk', 'hangar-talk', true);

-- Storage RLS: active members can upload
CREATE POLICY "Active members can upload chat files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hangar-talk'
    AND EXISTS (
      SELECT 1 FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );

-- Public read for the bucket
CREATE POLICY "Anyone can read chat files"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'hangar-talk');

-- Admin can delete files
CREATE POLICY "Admins can delete chat files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hangar-talk'
    AND has_role(auth.uid(), 'admin')
  );
