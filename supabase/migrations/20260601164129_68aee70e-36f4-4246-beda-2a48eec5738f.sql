CREATE OR REPLACE FUNCTION public.engagement_by_member()
RETURNS TABLE(
  key_id integer,
  first_name text,
  last_name text,
  nickname text,
  email text,
  total_events bigint,
  events_30d bigint,
  events_7d bigint,
  last_seen timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    rm.key_id,
    rm.first_name,
    rm.last_name,
    rm.nickname,
    rm.email,
    count(e.*)::bigint AS total_events,
    count(e.*) FILTER (WHERE e.created_at >= now() - interval '30 days')::bigint AS events_30d,
    count(e.*) FILTER (WHERE e.created_at >= now() - interval '7 days')::bigint AS events_7d,
    max(e.created_at) AS last_seen
  FROM member_engagement_events e
  JOIN roster_members rm ON rm.key_id = e.key_id
  GROUP BY rm.key_id, rm.first_name, rm.last_name, rm.nickname, rm.email
  ORDER BY max(e.created_at) DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.engagement_by_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.engagement_by_member() TO authenticated;