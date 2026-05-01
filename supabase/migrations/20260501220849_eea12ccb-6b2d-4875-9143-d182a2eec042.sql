-- Drop the auto-assign trigger so assignments are fully manual
DROP TRIGGER IF EXISTS trg_auto_assign_buddy ON public.new_member_applications;

-- Rename "reminder" template key to "check_in", preserving subject/body
UPDATE public.buddy_email_templates
SET template_key = 'check_in', updated_at = now()
WHERE template_key = 'reminder';