
-- Create a trigger function that invokes new-member-notify via pg_net
CREATE OR REPLACE FUNCTION public.notify_new_member_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  -- Get config from vault or env
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fall back to direct config if app settings not available
  IF _supabase_url IS NULL THEN
    SELECT decrypted_secret INTO _supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  END IF;
  IF _service_role_key IS NULL THEN
    SELECT decrypted_secret INTO _service_role_key
    FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  END IF;

  -- Only proceed if we have the necessary config
  IF _supabase_url IS NOT NULL AND _service_role_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _supabase_url || '/functions/v1/new-member-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_role_key
      ),
      body := jsonb_build_object(
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'eaa_number', NEW.eaa_number,
        'email', NEW.email,
        'city', NEW.city,
        'state', NEW.state
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on new_member_applications INSERT
CREATE TRIGGER trigger_notify_new_member
AFTER INSERT ON public.new_member_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_member_application();
