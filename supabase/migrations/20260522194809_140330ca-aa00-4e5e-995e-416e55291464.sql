ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS links text[] NOT NULL DEFAULT '{}'::text[];