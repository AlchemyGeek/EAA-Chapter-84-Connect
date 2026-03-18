
CREATE OR REPLACE FUNCTION public.reassign_buddy(_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_volunteer_key_id integer;
  _best_volunteer_key_id integer;
  _three_months_ago timestamptz := now() - interval '3 months';
BEGIN
  -- Get current assignment
  SELECT volunteer_key_id INTO _current_volunteer_key_id
  FROM buddy_assignments
  WHERE application_id = _application_id;

  -- Find the best volunteer excluding the current one
  SELECT bv.key_id INTO _best_volunteer_key_id
  FROM buddy_volunteers bv
  LEFT JOIN buddy_assignments ba 
    ON ba.volunteer_key_id = bv.key_id 
    AND ba.assigned_at > _three_months_ago
  WHERE bv.key_id IS DISTINCT FROM _current_volunteer_key_id
  GROUP BY bv.key_id
  ORDER BY COUNT(ba.id) ASC, bv.created_at ASC
  LIMIT 1;

  IF _best_volunteer_key_id IS NULL THEN
    RAISE EXCEPTION 'No other volunteers available for reassignment';
  END IF;

  -- Update or insert assignment
  IF _current_volunteer_key_id IS NOT NULL THEN
    UPDATE buddy_assignments
    SET volunteer_key_id = _best_volunteer_key_id, assigned_at = now()
    WHERE application_id = _application_id;
  ELSE
    INSERT INTO buddy_assignments (volunteer_key_id, application_id)
    VALUES (_best_volunteer_key_id, _application_id);
  END IF;
END;
$$;
