
-- 1. Create engagement events table
CREATE TABLE public.member_engagement_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_id integer NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_engagement_events_key_id ON member_engagement_events (key_id);
CREATE INDEX idx_engagement_events_created_at ON member_engagement_events (created_at);
CREATE INDEX idx_engagement_events_type ON member_engagement_events (event_type);

ALTER TABLE public.member_engagement_events ENABLE ROW LEVEL SECURITY;

-- Members can insert their own events
CREATE POLICY "Members can insert own engagement events"
ON member_engagement_events
FOR INSERT
TO authenticated
WITH CHECK (
  key_id IN (
    SELECT rm.key_id FROM roster_members rm
    WHERE lower(rm.email) = lower((auth.jwt() ->> 'email'::text))
  )
);

-- Officers and admins can view all events
CREATE POLICY "Officers and admins can view engagement events"
ON member_engagement_events
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_officer((auth.jwt() ->> 'email'::text))
);

-- 2. KPI function
CREATE OR REPLACE FUNCTION public.engagement_kpis()
RETURNS TABLE (
  active_30d bigint,
  active_7d bigint,
  total_active_members bigint,
  highly_engaged_30d bigint,
  dormant_60d bigint,
  service_page_views_30d bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_30 AS (
    SELECT DISTINCT key_id FROM member_engagement_events
    WHERE created_at >= now() - interval '30 days'
  ),
  active_7 AS (
    SELECT DISTINCT key_id FROM member_engagement_events
    WHERE created_at >= now() - interval '7 days'
  ),
  highly_engaged AS (
    SELECT key_id FROM member_engagement_events
    WHERE created_at >= now() - interval '30 days'
    GROUP BY key_id HAVING count(*) >= 5
  ),
  total_active AS (
    SELECT count(*) AS cnt FROM roster_members
    WHERE current_standing = 'Active'
  ),
  dormant AS (
    SELECT count(*) AS cnt FROM roster_members rm
    WHERE rm.current_standing = 'Active'
      AND NOT EXISTS (
        SELECT 1 FROM member_engagement_events e
        WHERE e.key_id = rm.key_id
          AND e.created_at >= now() - interval '60 days'
      )
  ),
  svc AS (
    SELECT count(*) AS cnt FROM member_engagement_events
    WHERE event_type = 'service_page'
      AND created_at >= now() - interval '30 days'
  )
  SELECT
    (SELECT count(*) FROM active_30)::bigint,
    (SELECT count(*) FROM active_7)::bigint,
    (SELECT cnt FROM total_active)::bigint,
    (SELECT count(*) FROM highly_engaged)::bigint,
    (SELECT cnt FROM dormant)::bigint,
    (SELECT cnt FROM svc)::bigint;
$$;

-- 3. Trend function (weekly buckets, last 12 weeks)
CREATE OR REPLACE FUNCTION public.engagement_trend()
RETURNS TABLE (
  week_start date,
  active_members bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', now() - interval '11 weeks')::date,
      date_trunc('week', now())::date,
      '1 week'::interval
    )::date AS week_start
  )
  SELECT
    w.week_start,
    count(DISTINCT e.key_id)::bigint AS active_members
  FROM weeks w
  LEFT JOIN member_engagement_events e
    ON e.created_at >= w.week_start
    AND e.created_at < w.week_start + interval '7 days'
  GROUP BY w.week_start
  ORDER BY w.week_start;
$$;
