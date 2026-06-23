GRANT SELECT ON public.email_send_log TO authenticated;

CREATE POLICY "Admins and officers can read send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_officer((auth.jwt() ->> 'email'))
);