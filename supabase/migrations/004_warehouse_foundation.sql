-- Migration: 004_warehouse_foundation.sql
-- Task 1.1 — Add location_type to locations table
-- Purpose: Distinguish between store locations and the centralized warehouse.
--          All existing locations default to 'store'. The warehouse will be
--          inserted separately (Task 1.14) with location_type = 'warehouse'.

-- Step 1: Add the column with a default so existing rows are backfilled instantly
ALTER TABLE locations
  ADD COLUMN location_type TEXT NOT NULL DEFAULT 'store';

-- Step 2: Enforce only valid values — prevents typos and invalid inserts
ALTER TABLE locations
  ADD CONSTRAINT locations_type_check
  CHECK (location_type IN ('store', 'warehouse'));

-- Step 3: Index for filtering queries (e.g. WHERE location_type = 'store')
--         Used by: getWarehouseLocation(), All Stores overview (Phase 2)
CREATE INDEX idx_locations_type ON locations(location_type);


-- TASK 1.2

ALTER TABLE items
    ADD COLUMN box_quantity INTEGER NULL;

ALTER TABLE items
    ADD CONSTRAINT items_box_qty_check
        CHECK (box_quantity IS NULL OR box_quantity > 0);

ALTER TABLE items
    ADD COLUMN cost_per_unit NUMERIC(10,2) NULL;

-- Verification (run manually to confirm after migration):
--   SELECT id, name, location_type FROM locations;
--   → All existing rows should show location_type = 'store'
--
--   INSERT INTO locations (organization_id, name, address, location_type)
--   VALUES ('org_123', 'Test Warehouse', '{"street":"1 Main St","city":"Brooklyn","state":"NY","zip":"11201"}', 'warehouse');
--   → Should succeed
--
--   INSERT INTO locations (organization_id, name, address, location_type)
--   VALUES ('org_123', 'Bad Type', '{"street":"1 Main St","city":"Brooklyn","state":"NY","zip":"11201"}', 'depot');
--   → Should fail with: ERROR: new row violates check constraint "locations_type_check"
