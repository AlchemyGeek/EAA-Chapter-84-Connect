CREATE OR REPLACE FUNCTION public.reassign_buddy(_application_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _current_volunteer_key_id integer;
  _best_volunteer_key_id integer;
  _three_months_ago timestamptz := now() - interval '3 months';
BEGIN
  SELECT volunteer_key_id INTO _current_volunteer_key_id
  FROM buddy_assignments
  WHERE application_id = _application_id;

  SELECT bv.key_id INTO _best_volunteer_key_id
  FROM buddy_volunteers bv
  LEFT JOIN buddy_assignments ba 
    ON ba.volunteer_key_id = bv.key_id 
    AND ba.assigned_at > _three_months_ago
  WHERE bv.key_id IS DISTINCT FROM _current_volunteer_key_id
  GROUP BY bv.key_id, bv.created_at
  ORDER BY COUNT(ba.id) ASC, bv.created_at ASC
  LIMIT 1;

  IF _best_volunteer_key_id IS NULL THEN
    RAISE EXCEPTION 'No other volunteers available for reassignment';
  END IF;

  IF _current_volunteer_key_id IS NOT NULL THEN
    UPDATE buddy_assignments
    SET volunteer_key_id = _best_volunteer_key_id, assigned_at = now()
    WHERE application_id = _application_id;
  ELSE
    INSERT INTO buddy_assignments (volunteer_key_id, application_id)
    VALUES (_best_volunteer_key_id, _application_id);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_buddy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _best_volunteer_key_id integer;
  _three_months_ago timestamptz := now() - interval '3 months';
BEGIN
  IF NEW.processed = true AND (OLD.processed IS DISTINCT FROM true) THEN
    SELECT bv.key_id INTO _best_volunteer_key_id
    FROM buddy_volunteers bv
    LEFT JOIN buddy_assignments ba 
      ON ba.volunteer_key_id = bv.key_id 
      AND ba.assigned_at > _three_months_ago
    GROUP BY bv.key_id, bv.created_at
    ORDER BY COUNT(ba.id) ASC, bv.created_at ASC
    LIMIT 1;

    IF _best_volunteer_key_id IS NOT NULL THEN
      INSERT INTO buddy_assignments (volunteer_key_id, application_id)
      VALUES (_best_volunteer_key_id, NEW.id)
      ON CONFLICT (application_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;