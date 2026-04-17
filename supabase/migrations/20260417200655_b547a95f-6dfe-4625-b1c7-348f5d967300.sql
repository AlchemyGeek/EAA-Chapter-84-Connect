-- Newsletter archive table
CREATE TABLE public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  issue_date DATE NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending', -- pending | done | failed
  extraction_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(extracted_text, '')), 'B')
  ) STORED
);

CREATE INDEX newsletters_search_idx ON public.newsletters USING GIN (search_vector);
CREATE INDEX newsletters_issue_date_idx ON public.newsletters (issue_date DESC);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- Officers/Admins: full management
CREATE POLICY "Officers and admins can insert newsletters"
  ON public.newsletters FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email')));

CREATE POLICY "Officers and admins can update newsletters"
  ON public.newsletters FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email')));

CREATE POLICY "Officers and admins can delete newsletters"
  ON public.newsletters FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email')));

-- Active members can view
CREATE POLICY "Active members can view newsletters"
  ON public.newsletters FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR is_officer((auth.jwt() ->> 'email'))
    OR EXISTS (
      SELECT 1 FROM roster_members rm
      WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
        AND rm.current_standing = 'Active'
    )
  );

-- updated_at trigger
CREATE TRIGGER trg_newsletters_updated_at
BEFORE UPDATE ON public.newsletters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Search function with snippets
CREATE OR REPLACE FUNCTION public.search_newsletters(_query text)
RETURNS TABLE(
  id uuid,
  title text,
  issue_date date,
  storage_path text,
  extraction_status text,
  snippet text,
  rank real
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _allowed boolean;
  _tsq tsquery;
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
             NULL::text AS snippet, 0::real AS rank
      FROM newsletters n
      ORDER BY n.issue_date DESC;
    RETURN;
  END IF;

  _tsq := websearch_to_tsquery('english', _query);

  RETURN QUERY
    SELECT
      n.id, n.title, n.issue_date, n.storage_path, n.extraction_status,
      ts_headline('english', coalesce(n.extracted_text, ''), _tsq,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15, MaxFragments=2, ShortWord=3'
      ) AS snippet,
      ts_rank(n.search_vector, _tsq) AS rank
    FROM newsletters n
    WHERE n.search_vector @@ _tsq
    ORDER BY rank DESC, n.issue_date DESC;
END;
$$;

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('newsletters', 'newsletters', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Officers and admins can upload newsletters"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'newsletters'
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email')))
  );

CREATE POLICY "Officers and admins can update newsletter files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'newsletters'
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email')))
  );

CREATE POLICY "Officers and admins can delete newsletter files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'newsletters'
    AND (has_role(auth.uid(), 'admin'::app_role) OR is_officer((auth.jwt() ->> 'email')))
  );

CREATE POLICY "Active members can read newsletter files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'newsletters'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR is_officer((auth.jwt() ->> 'email'))
      OR EXISTS (
        SELECT 1 FROM roster_members rm
        WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'))
          AND rm.current_standing = 'Active'
      )
    )
  );