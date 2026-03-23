
-- Fix new_member_applications officer policies (they reference roster_members causing recursion)
DROP POLICY IF EXISTS "Officers can view applications" ON public.new_member_applications;
CREATE POLICY "Officers can view applications"
  ON public.new_member_applications
  FOR SELECT TO authenticated
  USING (is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers can update applications" ON public.new_member_applications;
CREATE POLICY "Officers can update applications"
  ON public.new_member_applications
  FOR UPDATE TO authenticated
  USING (is_officer(auth.jwt() ->> 'email'));

-- Fix buddy_assignments policies
DROP POLICY IF EXISTS "Officers and admins can view buddy assignments" ON public.buddy_assignments;
CREATE POLICY "Officers and admins can view buddy assignments"
  ON public.buddy_assignments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can insert buddy assignments" ON public.buddy_assignments;
CREATE POLICY "Officers and admins can insert buddy assignments"
  ON public.buddy_assignments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can update buddy assignments" ON public.buddy_assignments;
CREATE POLICY "Officers and admins can update buddy assignments"
  ON public.buddy_assignments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can delete buddy assignments" ON public.buddy_assignments;
CREATE POLICY "Officers and admins can delete buddy assignments"
  ON public.buddy_assignments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

-- Fix buddy_volunteers policies
DROP POLICY IF EXISTS "Officers and admins can view buddy volunteers" ON public.buddy_volunteers;
CREATE POLICY "Officers and admins can view buddy volunteers"
  ON public.buddy_volunteers FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can insert buddy volunteers" ON public.buddy_volunteers;
CREATE POLICY "Officers and admins can insert buddy volunteers"
  ON public.buddy_volunteers FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can delete buddy volunteers" ON public.buddy_volunteers;
CREATE POLICY "Officers and admins can delete buddy volunteers"
  ON public.buddy_volunteers FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

-- Fix buddy_email_log policies
DROP POLICY IF EXISTS "Officers and admins can view email log" ON public.buddy_email_log;
CREATE POLICY "Officers and admins can view email log"
  ON public.buddy_email_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can insert email log" ON public.buddy_email_log;
CREATE POLICY "Officers and admins can insert email log"
  ON public.buddy_email_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

-- Fix badge_deliveries policies
DROP POLICY IF EXISTS "Officers and admins can view badge deliveries" ON public.badge_deliveries;
CREATE POLICY "Officers and admins can view badge deliveries"
  ON public.badge_deliveries FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can insert badge deliveries" ON public.badge_deliveries;
CREATE POLICY "Officers and admins can insert badge deliveries"
  ON public.badge_deliveries FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can delete badge deliveries" ON public.badge_deliveries;
CREATE POLICY "Officers and admins can delete badge deliveries"
  ON public.badge_deliveries FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

-- Fix dues_payments policies
DROP POLICY IF EXISTS "Officers and admins can view payments" ON public.dues_payments;
CREATE POLICY "Officers and admins can view payments"
  ON public.dues_payments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can insert payments" ON public.dues_payments;
CREATE POLICY "Officers and admins can insert payments"
  ON public.dues_payments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can update payments" ON public.dues_payments;
CREATE POLICY "Officers and admins can update payments"
  ON public.dues_payments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can delete payments" ON public.dues_payments;
CREATE POLICY "Officers and admins can delete payments"
  ON public.dues_payments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

-- Fix volunteering policies
DROP POLICY IF EXISTS "Officers and admins can insert opportunities" ON public.volunteering_opportunities;
CREATE POLICY "Officers and admins can insert opportunities"
  ON public.volunteering_opportunities FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can update opportunities" ON public.volunteering_opportunities;
CREATE POLICY "Officers and admins can update opportunities"
  ON public.volunteering_opportunities FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can delete opportunities" ON public.volunteering_opportunities;
CREATE POLICY "Officers and admins can delete opportunities"
  ON public.volunteering_opportunities FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can delete applications" ON public.volunteering_applications;
CREATE POLICY "Officers and admins can delete applications"
  ON public.volunteering_applications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can insert opportunity contacts" ON public.volunteering_opportunity_contacts;
CREATE POLICY "Officers and admins can insert opportunity contacts"
  ON public.volunteering_opportunity_contacts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Officers and admins can delete opportunity contacts" ON public.volunteering_opportunity_contacts;
CREATE POLICY "Officers and admins can delete opportunity contacts"
  ON public.volunteering_opportunity_contacts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));
