-- Backfill organization_id on item_locations rows that were inserted with NULL
-- by the old receive_purchase_order() function.
-- Derives the org from the location's organization_id.
-- Safe to run multiple times (WHERE organization_id IS NULL guards it).

UPDATE item_locations il
SET    organization_id = l.organization_id
FROM   locations l
WHERE  il.location_id      = l.id
  AND  il.organization_id IS NULL;
