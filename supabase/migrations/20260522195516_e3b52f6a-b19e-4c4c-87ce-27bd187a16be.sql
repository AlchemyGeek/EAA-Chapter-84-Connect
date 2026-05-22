CREATE OR REPLACE FUNCTION public._classifieds_links_to_jsonb(_links text[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('url', u, 'label', u)) FROM unnest(_links) AS u),
    '[]'::jsonb
  );
$$;

ALTER TABLE public.classifieds
  ALTER COLUMN links DROP DEFAULT,
  ALTER COLUMN links TYPE jsonb USING public._classifieds_links_to_jsonb(links),
  ALTER COLUMN links SET DEFAULT '[]'::jsonb,
  ALTER COLUMN links SET NOT NULL;

DROP FUNCTION public._classifieds_links_to_jsonb(text[]);