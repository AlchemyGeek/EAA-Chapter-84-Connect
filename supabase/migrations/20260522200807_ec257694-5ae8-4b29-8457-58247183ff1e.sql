
CREATE OR REPLACE FUNCTION public.sync_classifieds_contact(_key_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _phone text;
  _phone_private boolean;
  _contact_visible boolean;
  _phone_visible boolean;
BEGIN
  SELECT cell_phone, COALESCE(cell_phone_private, false)
    INTO _phone, _phone_private
  FROM roster_members WHERE key_id = _key_id;

  SELECT COALESCE(contact_visible_in_directory, false)
    INTO _contact_visible
  FROM member_chapter_data WHERE key_id = _key_id;

  _phone_visible :=
    COALESCE(_phone, '') <> ''
    AND _phone_private = false
    AND COALESCE(_contact_visible, false) = true;

  UPDATE classifieds
    SET author_phone = CASE WHEN _phone_visible THEN _phone ELSE NULL END,
        author_phone_visible = _phone_visible
  WHERE author_key_id = _key_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_classifieds_from_roster()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.cell_phone IS DISTINCT FROM OLD.cell_phone)
     OR (COALESCE(NEW.cell_phone_private, false) IS DISTINCT FROM COALESCE(OLD.cell_phone_private, false)) THEN
    PERFORM public.sync_classifieds_contact(NEW.key_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classifieds_contact_from_roster ON public.roster_members;
CREATE TRIGGER classifieds_contact_from_roster
AFTER UPDATE ON public.roster_members
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_classifieds_from_roster();

CREATE OR REPLACE FUNCTION public.trg_sync_classifieds_from_mcd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR (COALESCE(NEW.contact_visible_in_directory, false)
         IS DISTINCT FROM COALESCE(OLD.contact_visible_in_directory, false)) THEN
    PERFORM public.sync_classifieds_contact(NEW.key_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classifieds_contact_from_mcd ON public.member_chapter_data;
CREATE TRIGGER classifieds_contact_from_mcd
AFTER INSERT OR UPDATE ON public.member_chapter_data
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_classifieds_from_mcd();

-- Backfill existing classifieds with current visibility state
DO $$
DECLARE _kid integer;
BEGIN
  FOR _kid IN SELECT DISTINCT author_key_id FROM classifieds LOOP
    PERFORM public.sync_classifieds_contact(_kid);
  END LOOP;
END;
$$;
