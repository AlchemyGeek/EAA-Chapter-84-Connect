CREATE OR REPLACE FUNCTION public.engagement_by_page(_days integer DEFAULT NULL)
RETURNS TABLE(page text, visits bigint, members bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _rollout timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT min(created_at) INTO _rollout FROM member_engagement_events WHERE event_type LIKE 'page_view:%';
  RETURN QUERY
  SELECT x.pg, count(*)::bigint, count(DISTINCT x.key_id)::bigint
  FROM (
    SELECT e.key_id,
      CASE
        WHEN e.event_type LIKE 'page_view:%' THEN substring(e.event_type from 11)
        WHEN _rollout IS NOT NULL AND e.created_at >= _rollout THEN NULL
        WHEN e.event_type = 'login' THEN 'home'
        WHEN e.event_type = 'directory_view' THEN 'directory'
        WHEN e.event_type = 'profile_view' THEN 'profile'
        WHEN e.event_type = 'service_page' THEN 'legacy_services'
      END AS pg
    FROM member_engagement_events e
    WHERE (_days IS NULL OR e.created_at >= now() - make_interval(days => _days))
  ) x
  WHERE x.pg IS NOT NULL
  GROUP BY x.pg
  ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.engagement_kpis()
 RETURNS TABLE(active_30d bigint, active_7d bigint, total_active_members bigint, highly_engaged_30d bigint, dormant_60d bigint, service_page_views_30d bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH active_30 AS (
    SELECT DISTINCT key_id FROM member_engagement_events WHERE created_at >= now() - interval '30 days'
  ),
  active_7 AS (
    SELECT DISTINCT key_id FROM member_engagement_events WHERE created_at >= now() - interval '7 days'
  ),
  highly_engaged AS (
    SELECT key_id FROM member_engagement_events
    WHERE created_at >= now() - interval '30 days' AND event_type NOT LIKE 'page_view:%'
    GROUP BY key_id HAVING count(*) >= 5
  ),
  total_active AS (SELECT count(*) AS cnt FROM roster_members WHERE current_standing = 'Active'),
  dormant AS (
    SELECT count(*) AS cnt FROM roster_members rm
    WHERE rm.current_standing = 'Active'
      AND NOT EXISTS (SELECT 1 FROM member_engagement_events e WHERE e.key_id = rm.key_id AND e.created_at >= now() - interval '60 days')
  ),
  svc AS (
    SELECT count(*) AS cnt FROM member_engagement_events
    WHERE event_type = 'service_page' AND created_at >= now() - interval '30 days'
  )
  SELECT (SELECT count(*) FROM active_30)::bigint, (SELECT count(*) FROM active_7)::bigint,
    (SELECT cnt FROM total_active)::bigint, (SELECT count(*) FROM highly_engaged)::bigint,
    (SELECT cnt FROM dormant)::bigint, (SELECT cnt FROM svc)::bigint;
$function$;

CREATE OR REPLACE FUNCTION public.engagement_by_member()
 RETURNS TABLE(key_id integer, first_name text, last_name text, nickname text, email text, total_events bigint, events_30d bigint, events_7d bigint, last_seen timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT rm.key_id, rm.first_name, rm.last_name, rm.nickname, rm.email,
    count(e.*)::bigint,
    count(e.*) FILTER (WHERE e.created_at >= now() - interval '30 days')::bigint,
    count(e.*) FILTER (WHERE e.created_at >= now() - interval '7 days')::bigint,
    max(e.created_at)
  FROM member_engagement_events e
  JOIN roster_members rm ON rm.key_id = e.key_id
  WHERE e.event_type NOT LIKE 'page_view:%'
  GROUP BY rm.key_id, rm.first_name, rm.last_name, rm.nickname, rm.email
  ORDER BY max(e.created_at) DESC NULLS LAST;
$function$;