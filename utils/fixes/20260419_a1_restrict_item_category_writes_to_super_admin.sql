BEGIN;

-- Drop store-admin write policies on items
DROP POLICY IF EXISTS "Admins can insert items in their organization" ON public.items;
DROP POLICY IF EXISTS "Admins can update items in their organization" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items in their organization" ON public.items;

-- Drop store-admin write policies on category
DROP POLICY IF EXISTS "Admins can insert category in their organization" ON public.category;
DROP POLICY IF EXISTS "Admins can update category in their organization" ON public.category;
DROP POLICY IF EXISTS "Admins can delete category in their organization" ON public.category;

-- Cleanup: drop the duplicate SELECT policies (will be recreated or already exist as consolidated)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.category;

COMMIT;
