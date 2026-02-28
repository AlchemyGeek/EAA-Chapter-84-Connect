
-- Table for admin-configurable links
CREATE TABLE public.site_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_links ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can view site links"
ON public.site_links
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert site links"
ON public.site_links
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site links"
ON public.site_links
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site links"
ON public.site_links
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_site_links_updated_at
BEFORE UPDATE ON public.site_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
