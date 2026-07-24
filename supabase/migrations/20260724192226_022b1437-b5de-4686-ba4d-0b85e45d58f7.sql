DO $$
DECLARE
  v_app_id uuid := 'f9b0a8d8-1c08-4ed7-89f3-491b9f0d62cd';
  v_key_id integer := 143703;
  v_new_expiration date;
BEGIN
  SELECT make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1, 3, d)::date
  INTO v_new_expiration
  FROM generate_series(1, 14) AS d
  WHERE EXTRACT(DOW FROM make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1, 3, d)) = 2
  ORDER BY d
  OFFSET 1
  LIMIT 1;

  UPDATE public.new_member_applications
  SET roster_key_id = v_key_id,
      fees_verified = true,
      processed = true,
      processed_at = COALESCE(processed_at, now())
  WHERE id = v_app_id;

  INSERT INTO public.dues_payments (
    key_id,
    payment_date,
    amount,
    method,
    method_code,
    new_expiration_date,
    old_expiration_date,
    old_standing,
    exported,
    recorded_by_name
  )
  SELECT
    rm.key_id,
    CURRENT_DATE,
    10,
    'Square',
    'sq',
    v_new_expiration,
    rm.expiration_date,
    rm.current_standing,
    false,
    'System correction'
  FROM public.roster_members rm
  WHERE rm.key_id = v_key_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.dues_payments dp
      WHERE dp.key_id = v_key_id
        AND dp.exported = false
    );

  UPDATE public.roster_members
  SET member_type = 'Regular',
      expiration_date = v_new_expiration,
      udf1_text = COALESCE(udf1_text, to_char(CURRENT_DATE, 'MM/DD/YYYY') || ' $10/sq')
  WHERE key_id = v_key_id;
END $$;