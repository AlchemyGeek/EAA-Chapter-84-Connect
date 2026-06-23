
-- Repoint post_tags from duplicate to canonical (oldest by (created_at,id))
WITH canon AS (
  SELECT DISTINCT ON (lower(label)) id AS canonical_id, lower(label) AS lbl, created_at
  FROM public.hangar_talk_tags
  ORDER BY lower(label), created_at ASC, id ASC
),
dupes AS (
  SELECT t.id AS dup_id, c.canonical_id
  FROM public.hangar_talk_tags t
  JOIN canon c ON c.lbl = lower(t.label)
  WHERE t.id <> c.canonical_id
)
UPDATE public.hangar_talk_post_tags pt
   SET tag_id = d.canonical_id
  FROM dupes d
 WHERE pt.tag_id = d.dup_id
   AND NOT EXISTS (
     SELECT 1 FROM public.hangar_talk_post_tags x
      WHERE x.post_id = pt.post_id AND x.tag_id = d.canonical_id
   );

DELETE FROM public.hangar_talk_post_tags pt
 USING public.hangar_talk_tags t
 WHERE pt.tag_id = t.id
   AND EXISTS (
     SELECT 1 FROM public.hangar_talk_tags t2
      WHERE lower(t2.label) = lower(t.label)
        AND (t2.created_at, t2.id) < (t.created_at, t.id)
   );

WITH canon AS (
  SELECT DISTINCT ON (lower(label)) id AS canonical_id, lower(label) AS lbl
  FROM public.hangar_talk_tags
  ORDER BY lower(label), created_at ASC, id ASC
),
dupes AS (
  SELECT t.id AS dup_id, c.canonical_id
  FROM public.hangar_talk_tags t
  JOIN canon c ON c.lbl = lower(t.label)
  WHERE t.id <> c.canonical_id
)
UPDATE public.hangar_talk_member_tags mt
   SET tag_id = d.canonical_id
  FROM dupes d
 WHERE mt.tag_id = d.dup_id
   AND NOT EXISTS (
     SELECT 1 FROM public.hangar_talk_member_tags x
      WHERE x.key_id = mt.key_id AND x.tag_id = d.canonical_id
   );

DELETE FROM public.hangar_talk_member_tags mt
 USING public.hangar_talk_tags t
 WHERE mt.tag_id = t.id
   AND EXISTS (
     SELECT 1 FROM public.hangar_talk_tags t2
      WHERE lower(t2.label) = lower(t.label)
        AND (t2.created_at, t2.id) < (t.created_at, t.id)
   );

DELETE FROM public.hangar_talk_tags t
 WHERE EXISTS (
   SELECT 1 FROM public.hangar_talk_tags t2
    WHERE lower(t2.label) = lower(t.label)
      AND (t2.created_at, t2.id) < (t.created_at, t.id)
 );

-- Drop categories table (cascades through category_id FK)
DROP TABLE IF EXISTS public.hangar_talk_tag_categories CASCADE;

ALTER TABLE public.hangar_talk_tags
  DROP COLUMN IF EXISTS category_id,
  DROP COLUMN IF EXISTS archived,
  DROP COLUMN IF EXISTS position;

ALTER TABLE public.hangar_talk_tags
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE UNIQUE INDEX IF NOT EXISTS hangar_talk_tags_label_lower_unique
  ON public.hangar_talk_tags (lower(label));

CREATE OR REPLACE FUNCTION public.get_or_create_hangar_talk_tag(_label text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NOT (
    public.is_active_member()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_officer(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _clean := btrim(_label);
  IF _clean = '' OR _clean IS NULL THEN
    RAISE EXCEPTION 'Tag label cannot be empty';
  END IF;
  IF length(_clean) > 40 THEN
    RAISE EXCEPTION 'Tag label too long (max 40 characters)';
  END IF;

  SELECT id INTO _id FROM public.hangar_talk_tags
   WHERE lower(label) = lower(_clean)
   LIMIT 1;

  IF _id IS NOT NULL THEN
    RETURN _id;
  END IF;

  INSERT INTO public.hangar_talk_tags (label, created_by)
  VALUES (_clean, auth.uid())
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_hangar_talk_tag(text) TO authenticated;
