
-- Buddy volunteers table
CREATE TABLE public.buddy_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (key_id)
);

ALTER TABLE public.buddy_volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers and admins can view buddy volunteers"
ON public.buddy_volunteers FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Officers and admins can insert buddy volunteers"
ON public.buddy_volunteers FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Officers and admins can delete buddy volunteers"
ON public.buddy_volunteers FOR DELETE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )) OR has_role(auth.uid(), 'admin')
);

-- Buddy assignments table
CREATE TABLE public.buddy_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_key_id integer NOT NULL REFERENCES public.buddy_volunteers(key_id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.new_member_applications(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (application_id)
);

ALTER TABLE public.buddy_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers and admins can view buddy assignments"
ON public.buddy_assignments FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Officers and admins can insert buddy assignments"
ON public.buddy_assignments FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Officers and admins can update buddy assignments"
ON public.buddy_assignments FOR UPDATE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Officers and admins can delete buddy assignments"
ON public.buddy_assignments FOR DELETE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )) OR has_role(auth.uid(), 'admin')
);
