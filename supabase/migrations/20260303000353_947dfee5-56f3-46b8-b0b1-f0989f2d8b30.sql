
-- Create chapter leadership roles table
CREATE TABLE public.chapter_leadership (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (key_id, role)
);

-- Enable RLS
ALTER TABLE public.chapter_leadership ENABLE ROW LEVEL SECURITY;

-- Admins can manage leadership
CREATE POLICY "Admins can manage leadership"
ON public.chapter_leadership
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can view leadership
CREATE POLICY "Authenticated users can view leadership"
ON public.chapter_leadership
FOR SELECT
TO authenticated
USING (true);
