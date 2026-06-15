
-- =====================================================================
-- Helper: is the calling user an Active roster member?
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.roster_members rm
    WHERE LOWER(rm.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
      AND rm.current_standing = 'Active'
  );
$$;

-- =====================================================================
-- Helper: is the calling user the author of a given roster key_id?
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_roster_self(_key_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.roster_members rm
    WHERE rm.key_id = _key_id
      AND LOWER(rm.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );
$$;

-- =====================================================================
-- POST TYPE ENUM
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.hangar_talk_post_type AS ENUM ('question', 'help_wanted', 'fyi');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- POSTS
-- =====================================================================
CREATE TABLE public.hangar_talk_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_key_id INTEGER NOT NULL REFERENCES public.roster_members(key_id) ON DELETE SET NULL,
  type public.hangar_talk_post_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hangar_talk_posts_last_activity ON public.hangar_talk_posts(last_activity_at DESC);
CREATE INDEX idx_hangar_talk_posts_author ON public.hangar_talk_posts(author_key_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hangar_talk_posts TO authenticated;
GRANT ALL ON public.hangar_talk_posts TO service_role;
ALTER TABLE public.hangar_talk_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view posts"
  ON public.hangar_talk_posts FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Active members create own posts"
  ON public.hangar_talk_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member() AND public.is_roster_self(author_key_id));

CREATE POLICY "Authors update own posts"
  ON public.hangar_talk_posts FOR UPDATE TO authenticated
  USING (public.is_roster_self(author_key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_roster_self(author_key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Authors or admins delete posts"
  ON public.hangar_talk_posts FOR DELETE TO authenticated
  USING (public.is_roster_self(author_key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

CREATE TRIGGER trg_hangar_talk_posts_updated_at
  BEFORE UPDATE ON public.hangar_talk_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- POST IMAGES
-- =====================================================================
CREATE TABLE public.hangar_talk_post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.hangar_talk_posts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hangar_talk_post_images_post ON public.hangar_talk_post_images(post_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hangar_talk_post_images TO authenticated;
GRANT ALL ON public.hangar_talk_post_images TO service_role;
ALTER TABLE public.hangar_talk_post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members view post images"
  ON public.hangar_talk_post_images FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Authors manage own post images"
  ON public.hangar_talk_post_images FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hangar_talk_posts p
      WHERE p.id = post_id
        AND (public.is_roster_self(p.author_key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hangar_talk_posts p
      WHERE p.id = post_id
        AND (public.is_roster_self(p.author_key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'))
    )
  );

-- =====================================================================
-- REPLIES
-- =====================================================================
CREATE TABLE public.hangar_talk_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.hangar_talk_posts(id) ON DELETE CASCADE,
  author_key_id INTEGER NOT NULL REFERENCES public.roster_members(key_id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  image_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hangar_talk_replies_post ON public.hangar_talk_replies(post_id, created_at);
CREATE INDEX idx_hangar_talk_replies_author ON public.hangar_talk_replies(author_key_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hangar_talk_replies TO authenticated;
GRANT ALL ON public.hangar_talk_replies TO service_role;
ALTER TABLE public.hangar_talk_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members view replies"
  ON public.hangar_talk_replies FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Active members create own replies"
  ON public.hangar_talk_replies FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member() AND public.is_roster_self(author_key_id));

CREATE POLICY "Authors update own replies"
  ON public.hangar_talk_replies FOR UPDATE TO authenticated
  USING (public.is_roster_self(author_key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_roster_self(author_key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Authors or admins delete replies"
  ON public.hangar_talk_replies FOR DELETE TO authenticated
  USING (public.is_roster_self(author_key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

CREATE TRIGGER trg_hangar_talk_replies_updated_at
  BEFORE UPDATE ON public.hangar_talk_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bump parent post's last_activity_at on new reply
CREATE OR REPLACE FUNCTION public.hangar_talk_bump_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.hangar_talk_posts
  SET last_activity_at = now()
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hangar_talk_replies_bump
  AFTER INSERT ON public.hangar_talk_replies
  FOR EACH ROW EXECUTE FUNCTION public.hangar_talk_bump_activity();

-- =====================================================================
-- TAG CATEGORIES
-- =====================================================================
CREATE TABLE public.hangar_talk_tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hangar_talk_tag_categories TO authenticated;
GRANT ALL ON public.hangar_talk_tag_categories TO service_role;
ALTER TABLE public.hangar_talk_tag_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view tag categories"
  ON public.hangar_talk_tag_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage tag categories"
  ON public.hangar_talk_tag_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_hangar_talk_tag_categories_updated_at
  BEFORE UPDATE ON public.hangar_talk_tag_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- TAGS
-- =====================================================================
CREATE TABLE public.hangar_talk_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.hangar_talk_tag_categories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, label)
);
CREATE INDEX idx_hangar_talk_tags_category ON public.hangar_talk_tags(category_id);
GRANT SELECT ON public.hangar_talk_tags TO authenticated;
GRANT ALL ON public.hangar_talk_tags TO service_role;
ALTER TABLE public.hangar_talk_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view tags"
  ON public.hangar_talk_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage tags"
  ON public.hangar_talk_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_hangar_talk_tags_updated_at
  BEFORE UPDATE ON public.hangar_talk_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- MEMBER TAGS
-- =====================================================================
CREATE TABLE public.hangar_talk_member_tags (
  key_id INTEGER NOT NULL REFERENCES public.roster_members(key_id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.hangar_talk_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key_id, tag_id)
);
CREATE INDEX idx_hangar_talk_member_tags_tag ON public.hangar_talk_member_tags(tag_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hangar_talk_member_tags TO authenticated;
GRANT ALL ON public.hangar_talk_member_tags TO service_role;
ALTER TABLE public.hangar_talk_member_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members view member tags"
  ON public.hangar_talk_member_tags FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Members manage own tags"
  ON public.hangar_talk_member_tags FOR ALL TO authenticated
  USING (public.is_roster_self(key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'))
  WITH CHECK (public.is_roster_self(key_id) OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email'));

-- =====================================================================
-- STORAGE POLICIES (hangar-talk bucket)
-- Files stored under: {auth.uid()}/{post_id}/{filename}
-- =====================================================================
CREATE POLICY "Active members view hangar-talk files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hangar-talk' AND (public.is_active_member() OR public.has_role(auth.uid(),'admin') OR public.is_officer(auth.jwt() ->> 'email')));

CREATE POLICY "Active members upload own hangar-talk files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hangar-talk'
    AND public.is_active_member()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owners delete own hangar-talk files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hangar-talk'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR public.has_role(auth.uid(),'admin')
         OR public.is_officer(auth.jwt() ->> 'email'))
  );

CREATE POLICY "Owners update own hangar-talk files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hangar-talk'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR public.has_role(auth.uid(),'admin')
         OR public.is_officer(auth.jwt() ->> 'email'))
  );
