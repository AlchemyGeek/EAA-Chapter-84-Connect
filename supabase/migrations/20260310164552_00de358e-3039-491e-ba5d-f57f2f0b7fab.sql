ALTER TABLE public.roster_imports
  DROP CONSTRAINT roster_imports_imported_by_fkey,
  ADD CONSTRAINT roster_imports_imported_by_fkey
    FOREIGN KEY (imported_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;