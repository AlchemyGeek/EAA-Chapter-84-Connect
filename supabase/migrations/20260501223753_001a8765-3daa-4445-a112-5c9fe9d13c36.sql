ALTER TABLE public.new_member_applications
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;