
CREATE TABLE public.new_member_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  eaa_number text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  quarter_applied text NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.new_member_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public page, no auth)
CREATE POLICY "Anyone can submit applications"
  ON public.new_member_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view/manage applications
CREATE POLICY "Admins can view applications"
  ON public.new_member_applications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update applications"
  ON public.new_member_applications
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete applications"
  ON public.new_member_applications
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
