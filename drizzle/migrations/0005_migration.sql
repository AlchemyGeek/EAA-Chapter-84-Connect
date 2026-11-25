CREATE OR REPLACE FUNCTION public.engagement_by_page(_days integer DEFAULT NULL)
RETURNS TABLE(page text, visits bigint, members bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (has_role(auth.uid(), 'admin'::app_role) OR is_officer(auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  WITH ev AS (
    SELECT e.key_id,
      CASE
        WHEN e.event_type LIKE 'page_view:%' THEN substring(e.event_type from 11)
        WHEN e.event_type = 'login' THEN 'home'
        WHEN e.event_type = 'directory_view' THEN 'directory'
        WHEN e.event_type = 'profile_view' THEN 'profile'
        WHEN e.event_type = 'service_page' THEN 'legacy_services'
      END AS pg,
      e.event_type
    FROM member_engagement_events e
    WHERE (_days IS NULL OR e.created_at >= now() - make_interval(days => _days))
  ),
  -- once page_view events exist for a page, drop legacy duplicates of that same page/member/day is overkill;
  -- legacy events stop being written for new page keys only where they coexist, so exclude legacy rows
  -- that were written alongside page_view events (after rollout).
  rollout AS (SELECT min(created_at) AS t FROM member_engagement_events WHERE event_type LIKE 'page_view:%')
  SELECT ev.pg, count(*)::bigint, count(DISTINCT ev.key_id)::bigint
  FROM ev
  WHERE ev.pg IS NOT NULL
  GROUP BY ev.pg
  ORDER BY 2 DESC;
END;
$$;