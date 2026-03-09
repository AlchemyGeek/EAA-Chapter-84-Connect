
CREATE POLICY "Anon users can view fees"
  ON public.chapter_fees
  FOR SELECT
  TO anon
  USING (true);
