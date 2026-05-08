-- Fix: employees (and all authenticated users) cannot read items, categories,
-- or storage_spaces.
--
-- Root causes:
--
-- 1. items + category: migration 20260419_a1_restrict_item_category_writes_to_super_admin.sql
--    dropped the "Enable read access for all users" SELECT policies on both tables
--    with the comment "consolidated versions already exist" — but no consolidated
--    versions were ever created. This silently broke employee item reads, the
--    warehouse catalog filter, activity log item name joins, and any other
--    non-admin surface that reads items.
--
-- 2. storage_spaces: the identical "Enable read access for all users" SELECT policy
--    is absent from the live staging DB (dropped directly via Supabase dashboard
--    or never applied) — confirmed because data exists at the queried location_id
--    but the query returns 0 rows with no error (classic silent RLS block).
--
-- Fix: restore the same open SELECT policies that existed in the baseline.
-- Write access remains locked to super_admin (via serviceRole client) per A1.

-- Drop first in case a partial/broken version exists
DROP POLICY IF EXISTS "Enable read access for all users" ON public.items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.category;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.storage_spaces;

CREATE POLICY "Enable read access for all users" ON public.items
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON public.category
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON public.storage_spaces
  FOR SELECT USING (true);
