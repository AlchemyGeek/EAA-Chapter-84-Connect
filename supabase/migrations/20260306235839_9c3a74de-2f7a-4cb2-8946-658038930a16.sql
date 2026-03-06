
CREATE TABLE public.dues_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id integer NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL,
  method_code text NOT NULL,
  new_expiration_date date NOT NULL,
  old_expiration_date date,
  old_standing text,
  exported boolean NOT NULL DEFAULT false,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dues_payments ENABLE ROW LEVEL SECURITY;

-- Officers (chapter leadership) and admins can view all payments
CREATE POLICY "Officers and admins can view payments"
ON public.dues_payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chapter_leadership cl
    JOIN public.roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )
  OR has_role(auth.uid(), 'admin')
);

-- Officers and admins can insert payments
CREATE POLICY "Officers and admins can insert payments"
ON public.dues_payments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chapter_leadership cl
    JOIN public.roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )
  OR has_role(auth.uid(), 'admin')
);

-- Officers and admins can update payments (for export marking)
CREATE POLICY "Officers and admins can update payments"
ON public.dues_payments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chapter_leadership cl
    JOIN public.roster_members rm ON rm.key_id = cl.key_id
    WHERE rm.email = (auth.jwt() ->> 'email')
  )
  OR has_role(auth.uid(), 'admin')
);
