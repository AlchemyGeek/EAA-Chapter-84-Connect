CREATE TYPE public.briefing_room_category AS ENUM ('homebuilding','safety_regulatory','industry_news','events_airshows','eaa');
CREATE TYPE public.briefing_room_status AS ENUM ('pending_review','published','rejected','archived');

CREATE TABLE public.briefing_room_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  headline text NOT NULL,
  summary text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  source_published_at timestamptz,
  added_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  category public.briefing_room_category NOT NULL,
  status public.briefing_room_status NOT NULL DEFAULT 'pending_review',
  edited boolean NOT NULL DEFAULT false,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_by_name text,
  edited_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(headline,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(source_name,''))
  ) STORED
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_room_items TO authenticated;
GRANT ALL ON public.briefing_room_items TO service_role;

ALTER TABLE public.briefing_room_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read published briefing items"
  ON public.briefing_room_items FOR SELECT TO authenticated
  USING (status = 'published' AND public.is_active_member());

CREATE POLICY "Officers read all briefing items"
  ON public.briefing_room_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Officers insert briefing items"
  ON public.briefing_room_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Officers update briefing items"
  ON public.briefing_room_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_officer(auth.jwt() ->> 'email'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Officers delete briefing items"
  ON public.briefing_room_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_officer(auth.jwt() ->> 'email'));

CREATE INDEX briefing_room_items_search_idx ON public.briefing_room_items USING gin (search_vector);
CREATE INDEX briefing_room_items_status_idx ON public.briefing_room_items (status, added_at DESC);
CREATE INDEX briefing_room_items_category_idx ON public.briefing_room_items (category);
CREATE INDEX briefing_room_items_source_idx ON public.briefing_room_items (source_name);

CREATE TRIGGER update_briefing_room_items_updated_at
  BEFORE UPDATE ON public.briefing_room_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.briefing_room_settings (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  auto_publish boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.briefing_room_settings TO authenticated;
GRANT ALL ON public.briefing_room_settings TO service_role;

ALTER TABLE public.briefing_room_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers read briefing settings"
  ON public.briefing_room_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_officer(auth.jwt() ->> 'email'));

CREATE POLICY "Officers update briefing settings"
  ON public.briefing_room_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_officer(auth.jwt() ->> 'email'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_officer(auth.jwt() ->> 'email'));

CREATE TRIGGER update_briefing_room_settings_updated_at
  BEFORE UPDATE ON public.briefing_room_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.briefing_room_settings (id, auto_publish) VALUES (1, false);