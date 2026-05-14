INSERT INTO public.buddy_email_log (assignment_id, email_type)
VALUES
  ('3610a658-fd59-4c9a-94bd-7b432d9fcae8', 'intro'),
  ('7b782ab8-38c0-4142-91bb-48b66dd4964c', 'intro')
ON CONFLICT DO NOTHING;