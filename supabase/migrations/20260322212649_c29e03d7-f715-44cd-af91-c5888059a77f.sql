ALTER POLICY "Authenticated users can view member images"
  ON public.member_images
  TO authenticated;