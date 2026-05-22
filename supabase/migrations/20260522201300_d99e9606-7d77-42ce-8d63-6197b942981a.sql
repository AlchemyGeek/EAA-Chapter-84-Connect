UPDATE public.classifieds c
SET author_name = TRIM(BOTH ' ' FROM CONCAT_WS(' ',
  COALESCE(NULLIF(TRIM(rm.nickname), ''), rm.first_name),
  rm.last_name
))
FROM public.roster_members rm
WHERE rm.key_id = c.author_key_id
  AND (
    c.author_name IS NULL
    OR c.author_name = ''
    OR c.author_name = rm.last_name
  )
  AND COALESCE(rm.first_name, '') <> ''
  AND COALESCE(rm.last_name, '') <> '';