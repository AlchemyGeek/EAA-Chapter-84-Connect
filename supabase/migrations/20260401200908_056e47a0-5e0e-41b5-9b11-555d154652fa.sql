-- Add graduated_at column to buddy_assignments
ALTER TABLE public.buddy_assignments
ADD COLUMN graduated_at timestamptz DEFAULT NULL;

-- Remove the auto-assign trigger so assignments are manual
DROP TRIGGER IF EXISTS trigger_auto_assign_buddy ON public.new_member_applications;
