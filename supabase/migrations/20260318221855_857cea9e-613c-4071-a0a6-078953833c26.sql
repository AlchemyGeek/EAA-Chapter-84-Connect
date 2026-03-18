
CREATE OR REPLACE FUNCTION public.auto_assign_buddy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _best_volunteer_key_id integer;
  _three_months_ago timestamptz := now() - interval '3 months';
BEGIN
  -- Only fire when processed changes from false to true
  IF NEW.processed = true AND (OLD.processed IS DISTINCT FROM true) THEN
    -- Find the volunteer with the fewest active assignments (assigned within last 3 months)
    SELECT bv.key_id INTO _best_volunteer_key_id
    FROM buddy_volunteers bv
    LEFT JOIN buddy_assignments ba 
      ON ba.volunteer_key_id = bv.key_id 
      AND ba.assigned_at > _three_months_ago
    GROUP BY bv.key_id
    ORDER BY COUNT(ba.id) ASC, bv.created_at ASC
    LIMIT 1;

    -- If a volunteer exists, create the assignment
    IF _best_volunteer_key_id IS NOT NULL THEN
      INSERT INTO buddy_assignments (volunteer_key_id, application_id)
      VALUES (_best_volunteer_key_id, NEW.id)
      ON CONFLICT (application_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_buddy
  AFTER UPDATE ON public.new_member_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_buddy();
