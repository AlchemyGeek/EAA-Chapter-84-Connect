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
  _query_lexemes text[];
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

  -- Extract the stemmed lexemes from the query (same stemming as FTS)
  SELECT array_agg(DISTINCT lexeme) INTO _query_lexemes
  FROM ts_lexize_words(_query);

  RETURN QUERY
    SELECT
      n.id, n.title, n.issue_date, n.storage_path, n.extraction_status,
      ts_headline('english', coalesce(n.extracted_text, ''), _tsq,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15, MaxFragments=3, ShortWord=3'
      ) AS snippet,
      ts_rank(n.search_vector, _tsq) AS rank,
      COALESCE((
        SELECT sum(array_length(positions, 1))::integer
        FROM unnest(n.search_vector) AS sv(lexeme, positions, weights)
        WHERE sv.lexeme = ANY(_query_lexemes)
      ), 0) AS match_count
    FROM newsletters n
    WHERE n.search_vector @@ _tsq
    ORDER BY rank DESC, n.issue_date DESC;
END;
$function$;

-- Helper: extract stemmed lexemes from a free-text query using the english config
CREATE OR REPLACE FUNCTION public.ts_lexize_words(_query text)
 RETURNS TABLE(lexeme text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT word_lex
  FROM (
    SELECT (ts_debug('english', _query)).*
  ) d,
  LATERAL unnest(COALESCE(d.lexemes, ARRAY[]::text[])) AS word_lex
  WHERE d.lexemes IS NOT NULL AND array_length(d.lexemes, 1) > 0;
$function$;