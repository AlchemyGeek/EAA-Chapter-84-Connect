ALTER TABLE public.new_member_applications ADD COLUMN IF NOT EXISTS membership_type text NOT NULL DEFAULT 'regular';
ALTER TABLE public.new_member_applications ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.new_member_applications ADD CONSTRAINT new_member_applications_membership_type_check CHECK (membership_type IN ('regular','student'));