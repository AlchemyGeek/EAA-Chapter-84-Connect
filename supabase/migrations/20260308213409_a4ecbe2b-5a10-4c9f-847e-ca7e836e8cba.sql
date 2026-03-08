
-- Table to track member applications to volunteering opportunities
CREATE TABLE public.volunteering_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.volunteering_opportunities(id) ON DELETE CASCADE,
  key_id integer NOT NULL,
  member_name text NOT NULL DEFAULT '',
  member_email text,
  member_phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Prevent duplicate applications
CREATE UNIQUE INDEX volunteering_applications_unique ON public.volunteering_applications (opportunity_id, key_id);

ALTER TABLE public.volunteering_applications ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view applications
CREATE POLICY "Authenticated users can view applications"
  ON public.volunteering_applications FOR SELECT TO authenticated
  USING (true);

-- Members can insert their own applications (key_id must match their roster record)
CREATE POLICY "Members can insert own applications"
  ON public.volunteering_applications FOR INSERT TO authenticated
  WITH CHECK (
    key_id IN (
      SELECT rm.key_id FROM roster_members rm
      WHERE rm.email = (auth.jwt() ->> 'email'::text)
    )
  );

-- Officers and admins can delete applications
CREATE POLICY "Officers and admins can delete applications"
  ON public.volunteering_applications FOR DELETE TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email'::text)
    )) OR has_role(auth.uid(), 'admin'::app_role)
  );
