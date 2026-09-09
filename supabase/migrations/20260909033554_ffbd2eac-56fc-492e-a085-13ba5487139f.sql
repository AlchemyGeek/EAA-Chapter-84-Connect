DROP TRIGGER IF EXISTS trigger_notify_new_member ON public.new_member_applications;
DROP FUNCTION IF EXISTS public.notify_new_member_application() CASCADE;