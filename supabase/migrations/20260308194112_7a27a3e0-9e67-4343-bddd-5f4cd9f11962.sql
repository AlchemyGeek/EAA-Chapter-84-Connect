
CREATE TABLE public.badge_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id integer NOT NULL,
  year integer NOT NULL DEFAULT 2026,
  delivered_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_by uuid REFERENCES auth.users(id),
  delivered_by_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (key_id, year)
);

ALTER TABLE public.badge_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers and admins can view badge deliveries"
ON public.badge_deliveries FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email'::text)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Officers and admins can insert badge deliveries"
ON public.badge_deliveries FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email'::text)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Officers and admins can delete badge deliveries"
ON public.badge_deliveries FOR DELETE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email'::text)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);
