BEGIN;

-- Drop store-admin write policies on items.
-- After this migration, store admins (role='admin' in DB) can no longer INSERT/UPDATE/DELETE items.
--
-- Super admin write access is NOT handled by RLS policies here. In the DB, super_admin users also
-- have role='admin', so we cannot distinguish them at the RLS level without schema changes.
-- Instead, all super-admin item mutations use createServiceRoleClient() (bypasses RLS entirely).
-- The /super-admin route is Clerk-protected, so this is safe.
DROP POLICY IF EXISTS "Admins can insert items in their organization" ON public.items;
DROP POLICY IF EXISTS "Admins can update items in their organization" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items in their organization" ON public.items;

-- Drop store-admin write policies on category (same reasoning as above).
DROP POLICY IF EXISTS "Admins can insert category in their organization" ON public.category;
DROP POLICY IF EXISTS "Admins can update category in their organization" ON public.category;
DROP POLICY IF EXISTS "Admins can delete category in their organization" ON public.category;

-- Cleanup: remove duplicate SELECT policies (consolidated versions already exist).
DROP POLICY IF EXISTS "Enable read access for all users" ON public.items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.category;

COMMIT;
