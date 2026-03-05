
CREATE OR REPLACE FUNCTION public.inactive_members_by_import()
RETURNS TABLE(imported_at timestamptz, total_members bigint, inactive_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    ri.imported_at,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE 
      (rms.snapshot->>'current_standing') IS DISTINCT FROM 'Active'
      OR (rms.snapshot->>'expiration_date') IS NULL
      OR (rms.snapshot->>'expiration_date')::date < ri.imported_at::date
    ) as inactive_count
  FROM roster_imports ri
  JOIN roster_member_snapshots rms ON rms.import_id = ri.id
  WHERE ri.status = 'completed'
  GROUP BY ri.id, ri.imported_at
  ORDER BY ri.imported_at
$$;
