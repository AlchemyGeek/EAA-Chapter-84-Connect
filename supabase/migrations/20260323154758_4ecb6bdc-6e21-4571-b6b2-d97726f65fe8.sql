-- Fix 1: Restrict roster_import_changes SELECT to officers/admins only
DROP POLICY IF EXISTS "Authenticated users can view changes" ON public.roster_import_changes;
CREATE POLICY "Officers and admins can view changes"
  ON public.roster_import_changes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

-- Fix 2: Restrict roster_imports SELECT to officers/admins only
DROP POLICY IF EXISTS "Authenticated users can view imports" ON public.roster_imports;
CREATE POLICY "Officers and admins can view imports"
  ON public.roster_imports FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));

-- Fix 3: Replace permissive member_chapter_data SELECT with role-scoped policies
DROP POLICY IF EXISTS "Authenticated users can view chapter data" ON public.member_chapter_data;

CREATE POLICY "Members view own chapter data"
  ON public.member_chapter_data FOR SELECT TO authenticated
  USING (key_id IN (SELECT rm.key_id FROM roster_members rm WHERE lower(rm.email) = lower(auth.jwt() ->> 'email')));

CREATE POLICY "Officers and admins view all chapter data"
  ON public.member_chapter_data FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email'));