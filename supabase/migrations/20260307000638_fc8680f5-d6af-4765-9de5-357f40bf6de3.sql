
CREATE TABLE public.chapter_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chapter_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fees"
ON public.chapter_fees FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage fees"
ON public.chapter_fees FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_chapter_fees_updated_at
  BEFORE UPDATE ON public.chapter_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
