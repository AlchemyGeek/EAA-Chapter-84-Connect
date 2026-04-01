-- Make member-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'member-images';