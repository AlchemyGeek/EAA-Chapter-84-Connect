
CREATE TABLE public.hangar_talk_post_tags (
  post_id uuid NOT NULL REFERENCES public.hangar_talk_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.hangar_talk_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

GRANT SELECT, INSERT, DELETE ON public.hangar_talk_post_tags TO authenticated;
GRANT ALL ON public.hangar_talk_post_tags TO service_role;

ALTER TABLE public.hangar_talk_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members view post tags"
  ON public.hangar_talk_post_tags FOR SELECT
  USING (
    is_active_member()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_officer((auth.jwt() ->> 'email'::text))
  );

CREATE POLICY "Authors manage own post tags insert"
  ON public.hangar_talk_post_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hangar_talk_posts p
      WHERE p.id = post_id AND is_roster_self(p.author_key_id)
    )
  );

CREATE POLICY "Authors manage own post tags delete"
  ON public.hangar_talk_post_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.hangar_talk_posts p
      WHERE p.id = post_id AND is_roster_self(p.author_key_id)
    )
  );

CREATE INDEX hangar_talk_post_tags_tag_idx ON public.hangar_talk_post_tags(tag_id);
