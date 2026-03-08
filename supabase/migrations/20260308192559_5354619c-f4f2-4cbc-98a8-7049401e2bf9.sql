
-- Table to hold role assignments for members who haven't signed in yet
CREATE TABLE public.pending_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, role)
);

ALTER TABLE public.pending_user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage pending roles
CREATE POLICY "Admins can manage pending roles"
  ON public.pending_user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can view their own pending roles (for self-promotion)
CREATE POLICY "Users can view own pending roles"
  ON public.pending_user_roles FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Function to promote pending roles to user_roles on login
CREATE OR REPLACE FUNCTION public.promote_pending_roles(_user_id uuid, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT _user_id, pr.role
  FROM public.pending_user_roles pr
  WHERE pr.email = _email
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.pending_user_roles
  WHERE email = _email;
END;
$$;
