CREATE TABLE public.resource_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'chapter' CHECK (category IN ('chapter','national')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_links TO authenticated;
GRANT ALL ON public.resource_links TO service_role;
ALTER TABLE public.resource_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view resources" ON public.resource_links FOR SELECT TO authenticated
  USING (public.is_active_member() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'officer'));
CREATE POLICY "Staff can insert resources" ON public.resource_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'officer'));
CREATE POLICY "Staff can update resources" ON public.resource_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'officer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'officer'));
CREATE POLICY "Staff can delete resources" ON public.resource_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'officer'));
CREATE TRIGGER update_resource_links_updated_at BEFORE UPDATE ON public.resource_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();