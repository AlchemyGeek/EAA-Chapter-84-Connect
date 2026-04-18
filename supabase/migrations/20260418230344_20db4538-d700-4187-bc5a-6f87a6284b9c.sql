DROP FUNCTION IF EXISTS public.search_newsletters(text);

CREATE OR REPLACE FUNCTION public.search_newsletters(_query text)
 RETURNS TABLE(id uuid, title text, issue_date date, storage_path text, extraction_status text, snippet text, rank real, match_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _allowed boolean;
  _tsq tsquery;
  _terms text[];
  _pattern text;
BEGIN
  _email := (auth.jwt() ->> 'email');
  _allowed := has_role(auth.uid(), 'admin'::app_role)
              OR is_officer(_email)
              OR EXISTS (
                SELECT 1 FROM roster_members rm
                WHERE lower(rm.email) = lower(_email)
                  AND rm.current_standing = 'Active'
              );
  IF NOT _allowed THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _query IS NULL OR length(trim(_query)) = 0 THEN
    RETURN QUERY
      SELECT n.id, n.title, n.issue_date, n.storage_path, n.extraction_status,
             NULL::text AS snippet, 0::real AS rank, 0::integer AS match_count
      FROM newsletters n
      ORDER BY n.issue_date DESC;
    RETURN;
  END IF;

  _tsq := websearch_to_tsquery('english', _query);

  -- Build a case-insensitive word-boundary regex from the original query terms
  -- (strip operators like quotes, AND/OR markers, plus/minus signs)
  SELECT array_agg(t) INTO _terms
  FROM (
    SELECT regexp_replace(lower(unnest), '[^a-z0-9]', '', 'g') AS t
    FROM unnest(regexp_split_to_array(_query, '\s+'))
  ) sub
  WHERE length(t) > 0;

  IF _terms IS NULL OR array_length(_terms, 1) IS NULL THEN
    _pattern := NULL;
  ELSE
    _pattern := '\m(' || array_to_string(_terms, '|') || ')\M';
  END IF;

  RETURN QUERY
    SELECT
      n.id, n.title, n.issue_date, n.storage_path, n.extraction_status,
      ts_headline('english', coalesce(n.extracted_text, ''), _tsq,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15, MaxFragments=3, ShortWord=3'
      ) AS snippet,
      ts_rank(n.search_vector, _tsq) AS rank,
      CASE
        WHEN _pattern IS NULL THEN 0
        ELSE (
          SELECT count(*)::integer
          FROM regexp_matches(coalesce(n.extracted_text, ''), _pattern, 'gi')
        )
      END AS match_count
    FROM newsletters n
    WHERE n.search_vector @@ _tsq
    ORDER BY rank DESC, n.issue_date DESC;
END;
$function$;