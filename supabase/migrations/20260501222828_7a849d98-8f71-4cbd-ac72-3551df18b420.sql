CREATE POLICY "Applicants can view own application"
ON public.new_member_applications
FOR SELECT
TO authenticated
USING (lower(email) = lower((auth.jwt() ->> 'email')));