
CREATE OR REPLACE FUNCTION public.notify_new_member_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _coordinator RECORD;
  _unsubscribe_token text;
  _existing_token text;
  _message_id text;
  _safe_first_name text;
  _safe_last_name text;
  _safe_email text;
  _safe_eaa_number text;
  _safe_location text;
  _applicant_name text;
  _subject text;
  _html_body text;
BEGIN
  _message_id := gen_random_uuid()::text;

  -- Escape user-controlled values for HTML
  _safe_first_name := replace(replace(replace(replace(replace(
    COALESCE(NEW.first_name,''), '&','&amp;'), '<','&lt;'), '>','&gt;'), '"','&quot;'), '''','&#39;');
  _safe_last_name := replace(replace(replace(replace(replace(
    COALESCE(NEW.last_name,''), '&','&amp;'), '<','&lt;'), '>','&gt;'), '"','&quot;'), '''','&#39;');
  _safe_email := replace(replace(replace(replace(replace(
    COALESCE(NEW.email,''), '&','&amp;'), '<','&lt;'), '>','&gt;'), '"','&quot;'), '''','&#39;');
  _safe_eaa_number := replace(replace(replace(replace(replace(
    COALESCE(NEW.eaa_number,'Not provided'), '&','&amp;'), '<','&lt;'), '>','&gt;'), '"','&quot;'), '''','&#39;');
  _safe_location := replace(replace(replace(replace(replace(
    COALESCE(NULLIF(concat_ws(', ', NULLIF(NEW.city,''), NULLIF(NEW.state,'')), ''), 'Not provided'),
    '&','&amp;'), '<','&lt;'), '>','&gt;'), '"','&quot;'), '''','&#39;');

  _applicant_name := trim(both from (COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')));
  _subject := 'New Member Application - ' || _applicant_name;

  _html_body := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">'
    || '<h2 style="color: #1e3a5f;">New Member Application Received</h2>'
    || '<p>A new membership application has been submitted for <strong>EAA Chapter 84</strong>.</p>'
    || '<div style="background-color: #f4f6f8; border-radius: 8px; padding: 16px; margin: 16px 0;">'
    || '<h3 style="margin-top: 0; color: #1e3a5f;">Applicant Details</h3>'
    || '<table style="width: 100%; border-collapse: collapse;">'
    || '<tr><td style="padding: 4px 8px; color: #666;">Name:</td><td style="padding: 4px 8px;"><strong>'
    || _safe_first_name || ' ' || _safe_last_name || '</strong></td></tr>'
    || '<tr><td style="padding: 4px 8px; color: #666;">Email:</td><td style="padding: 4px 8px;">'
    || _safe_email || '</td></tr>'
    || '<tr><td style="padding: 4px 8px; color: #666;">EAA #:</td><td style="padding: 4px 8px;">'
    || _safe_eaa_number || '</td></tr>'
    || '<tr><td style="padding: 4px 8px; color: #666;">Location:</td><td style="padding: 4px 8px;">'
    || _safe_location || '</td></tr>'
    || '</table></div>'
    || '<p>Please log in to <a href="https://eaa84connect.lovable.app">Chapter 84 Connect</a> to review and process this application.</p>'
    || '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />'
    || '<p style="color: #999; font-size: 12px;">— Chapter 84 Connect</p></div>';

  -- Loop through Membership Coordinators and enqueue email for each
  FOR _coordinator IN
    SELECT rm.email AS coordinator_email
    FROM chapter_leadership cl
    JOIN roster_members rm ON rm.key_id = cl.key_id
    WHERE cl.role = 'Membership Coordinator'
      AND rm.email IS NOT NULL
  LOOP
    -- Get or create unsubscribe token
    SELECT token INTO _existing_token
    FROM email_unsubscribe_tokens
    WHERE email = _coordinator.coordinator_email AND used_at IS NULL
    ORDER BY created_at DESC LIMIT 1;

    IF _existing_token IS NULL THEN
      _unsubscribe_token := gen_random_uuid()::text;
      INSERT INTO email_unsubscribe_tokens (email, token)
      VALUES (_coordinator.coordinator_email, _unsubscribe_token);
    ELSE
      _unsubscribe_token := _existing_token;
    END IF;

    -- Enqueue directly — same pattern as all other app emails
    PERFORM enqueue_email(
      'transactional_emails',
      jsonb_build_object(
        'to', _coordinator.coordinator_email,
        'from', 'EAA Chapter 84 <notify@notify.eaa84.org>',
        'sender_domain', 'notify.eaa84.org',
        'subject', _subject,
        'html', _html_body,
        'text', regexp_replace(_html_body, '<[^>]+>', '', 'g'),
        'purpose', 'transactional',
        'label', 'new_member_application',
        'idempotency_key', 'new-member-notify-' || _message_id || '-' || _coordinator.coordinator_email,
        'unsubscribe_token', _unsubscribe_token,
        'message_id', _message_id || '-' || _coordinator.coordinator_email,
        'queued_at', now()::text
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
