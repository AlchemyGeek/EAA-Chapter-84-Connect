
-- Rename existing column and add a second visibility column
ALTER TABLE public.member_chapter_data
RENAME COLUMN visible_in_directory TO contact_visible_in_directory;

ALTER TABLE public.member_chapter_data
ADD COLUMN aviation_visible_in_directory boolean NOT NULL DEFAULT true;
