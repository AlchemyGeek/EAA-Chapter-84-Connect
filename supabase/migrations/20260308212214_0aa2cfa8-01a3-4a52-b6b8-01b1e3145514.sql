
-- Volunteering opportunities table
CREATE TABLE public.volunteering_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  num_volunteers integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Active',
  created_by_key_id integer NOT NULL,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Contact members for each opportunity
CREATE TABLE public.volunteering_opportunity_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.volunteering_opportunities(id) ON DELETE CASCADE,
  key_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.volunteering_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteering_opportunity_contacts ENABLE ROW LEVEL SECURITY;

-- Policies for volunteering_opportunities
CREATE POLICY "Authenticated users can view opportunities"
  ON public.volunteering_opportunities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Officers and admins can insert opportunities"
  ON public.volunteering_opportunities FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email')
    )) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Officers and admins can update opportunities"
  ON public.volunteering_opportunities FOR UPDATE TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email')
    )) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Officers and admins can delete opportunities"
  ON public.volunteering_opportunities FOR DELETE TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email')
    )) OR has_role(auth.uid(), 'admin')
  );

-- Policies for volunteering_opportunity_contacts
CREATE POLICY "Authenticated users can view opportunity contacts"
  ON public.volunteering_opportunity_contacts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Officers and admins can insert opportunity contacts"
  ON public.volunteering_opportunity_contacts FOR INSERT TO authenticated
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email')
    )) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Officers and admins can delete opportunity contacts"
  ON public.volunteering_opportunity_contacts FOR DELETE TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email')
    )) OR has_role(auth.uid(), 'admin')
  );

-- Updated_at trigger
CREATE TRIGGER update_volunteering_opportunities_updated_at
  BEFORE UPDATE ON public.volunteering_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
