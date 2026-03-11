
CREATE POLICY "Officers and admins can delete payments"
ON public.dues_payments
FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email'::text)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);
