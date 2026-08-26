CREATE OR REPLACE FUNCTION public.restrict_member_chapter_data_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_email text;
  _is_admin boolean;
  _is_officer boolean;
BEGIN
  _caller_email := (current_setting('request.jwt.claims', true)::json->>'email');
  _is_admin := has_role(auth.uid(), 'admin');
  _is_officer := is_officer(_caller_email);

  IF _is_admin OR _is_officer THEN
    RETURN NEW;
  END IF;

  IF NEW.internal_notes IS NOT NULL
    OR NEW.volunteer_notes IS NOT NULL
    OR NEW.application_status IS NOT NULL
    OR NEW.chapter_payment_notes IS NOT NULL
    OR NEW.chapter_payment_method IS NOT NULL
    OR NEW.pending_roster_update IS NOT NULL
  THEN
    RAISE EXCEPTION 'Members can only set directory visibility settings';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS restrict_member_chapter_data_insert_trg ON public.member_chapter_data;
CREATE TRIGGER restrict_member_chapter_data_insert_trg
BEFORE INSERT ON public.member_chapter_data
FOR EACH ROW EXECUTE FUNCTION public.restrict_member_chapter_data_insert();