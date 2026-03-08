-- Migration: 011_item_category_crud_restrictions.sql
-- Task 1.18 — Restrict Item and Category CRUD to Super Admin Only
--
-- WHAT CHANGES:
--   items       INSERT/UPDATE/DELETE  admin → DENIED (super_admin only)
--   items       SELECT               unchanged (all roles can read)
--   category    INSERT/UPDATE/DELETE  admin → DENIED (super_admin only)
--   category    SELECT               unchanged (all roles can read)
--   item_locations UPDATE (min_quantity_override) admin → PRESERVED (explicit carve-out)
--   item_locations everything else   unchanged
--
-- DEPENDS ON:
--   005_rls_super_admin.sql  (is_super_admin, get_user_role helpers)
--   007_location_crud_restrictions.sql
-- ============================================================


-- ============================================================
-- ITEMS — drop broad admin write policy, replace with
--         super_admin-only write + all-roles SELECT
-- ============================================================

DROP POLICY IF EXISTS "Admins full access" ON items;

-- All authenticated users: SELECT (unchanged for store admins, employees, super admin)
CREATE POLICY "Authenticated users read items" ON items
  FOR SELECT TO authenticated
  USING (true);

-- Super admin only: INSERT
CREATE POLICY "Super admin insert items" ON items
  FOR INSERT TO authenticated
  WITH CHECK ( is_super_admin() );

-- Super admin only: UPDATE
CREATE POLICY "Super admin update items" ON items
  FOR UPDATE TO authenticated
  USING ( is_super_admin() )
  WITH CHECK ( is_super_admin() );

-- Super admin only: DELETE
-- Guard: cannot delete an item that is referenced in an active (non-cancelled,
-- non-rejected) order ticket. Enforced here at RLS layer and also at app layer.
CREATE POLICY "Super admin delete items" ON items
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    AND NOT EXISTS (
      SELECT 1 FROM order_ticket_items oti
      JOIN order_tickets ot ON ot.id = oti.ticket_id
      WHERE oti.item_id = items.id
        AND ot.status NOT IN ('cancelled', 'rejected')
    )
  );

-- Service role: full access (unchanged pattern)
CREATE POLICY "Service role full access items" ON items
  FOR ALL USING ( auth.role() = 'service_role' );


-- ============================================================
-- CATEGORY — same pattern as items
-- ============================================================

DROP POLICY IF EXISTS "Admins full access" ON category;

-- All authenticated users: SELECT
CREATE POLICY "Authenticated users read categories" ON category
  FOR SELECT TO authenticated
  USING (true);

-- Super admin only: INSERT
CREATE POLICY "Super admin insert categories" ON category
  FOR INSERT TO authenticated
  WITH CHECK ( is_super_admin() );

-- Super admin only: UPDATE
CREATE POLICY "Super admin update categories" ON category
  FOR UPDATE TO authenticated
  USING ( is_super_admin() )
  WITH CHECK ( is_super_admin() );

-- Super admin only: DELETE
-- Guard: cannot delete a category that still has items assigned to it.
CREATE POLICY "Super admin delete categories" ON category
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
    AND NOT EXISTS (
      SELECT 1 FROM items WHERE items.category_id = category.id
    )
  );

-- Service role: full access
CREATE POLICY "Service role full access categories" ON category
  FOR ALL USING ( auth.role() = 'service_role' );


-- ============================================================
-- ITEM_LOCATIONS — explicit carve-out for min_quantity_override
--
-- The broad "Admins full access" policy on item_locations was
-- already updated in Task 1.8 to include super_admin. We do NOT
-- remove it here. Admin retains full item_locations access
-- (quantity updates, storage assignment, min override) — only
-- the parent items table write access is restricted.
--
-- This section is a verification comment only. No SQL changes
-- needed on item_locations for this task.
--
-- Confirm the following still hold after this migration:
--   - Admin can UPDATE item_locations.current_quantity     → YES (1.8 policy intact)
--   - Admin can UPDATE item_locations.min_quantity_override → YES (1.8 policy intact)
--   - Admin can INSERT item_locations (assign to storage)  → YES (1.8 policy intact)
--   - Admin can DELETE item_locations (remove from storage)→ YES (1.8 policy intact)
-- ============================================================


-- ============================================================
-- ACCEPTANCE CRITERIA TESTS
-- ============================================================
-- As admin:
--   SELECT * FROM items                              → Rows returned
--   INSERT INTO items (...)                          → RLS violation
--   UPDATE items SET name = 'x' WHERE id = 1        → RLS violation
--   DELETE FROM items WHERE id = (no active tickets) → RLS violation
--   SELECT * FROM category                           → Rows returned
--   INSERT INTO category (...)                       → RLS violation
--   UPDATE category SET name = 'x' WHERE id = 1     → RLS violation
--   DELETE FROM category WHERE id = (no items)      → RLS violation
--   UPDATE item_locations SET min_quantity_override = 5 → Success (carve-out)
--   UPDATE item_locations SET current_quantity = 10     → Success (unchanged)
--
-- As super_admin:
--   INSERT INTO items (...)                                  → Success
--   DELETE FROM items WHERE (no active order tickets)        → Success
--   DELETE FROM items WHERE (active order ticket exists)     → RLS violation
--   DELETE FROM category WHERE (no items assigned)           → Success
--   DELETE FROM category WHERE (items assigned)              → RLS violation
-- ============================================================
