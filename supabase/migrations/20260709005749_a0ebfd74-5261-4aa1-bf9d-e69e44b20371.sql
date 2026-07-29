
CREATE TABLE public.squawk_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('announcement','whats_new')),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.squawk_entries TO authenticated;
GRANT ALL ON public.squawk_entries TO service_role;

ALTER TABLE public.squawk_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read squawk entries"
  ON public.squawk_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins can insert squawk entries"
  ON public.squawk_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins can update squawk entries"
  ON public.squawk_entries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins can delete squawk entries"
  ON public.squawk_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX squawk_entries_expires_at_idx ON public.squawk_entries(expires_at);

CREATE TRIGGER update_squawk_entries_updated_at
  BEFORE UPDATE ON public.squawk_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
