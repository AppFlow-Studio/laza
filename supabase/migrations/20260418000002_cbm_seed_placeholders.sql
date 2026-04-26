-- FIX-B4: CBM per carton seed migration (DRAFT — DO NOT MERGE YET)
-- Waiting on Naji's values from Laza_Invoice_China_Calculation.xlsx
-- Abubeckr to fill in the NULL placeholders before merging.
--
-- CBM is used by recalculate_po_costs() to allocate shared fees
-- (office_fee, shipping_fee) across PO line items proportionally.
-- Without it, cost allocation is degraded for all 94 items.
--
-- Target: 12 items from the China invoice, identified by SKU.
-- Replace each NULL with the actual cbm_per_carton value from Naji.

-- ── VALIDATION BEFORE ────────────────────────────────────────────
-- Run this before applying to confirm baseline (expect 0):
-- SELECT COUNT(*) as populated
-- FROM items
-- WHERE cbm_per_carton IS NOT NULL;

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-001'; -- 2 cup holder

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-002'; -- 2 holder + handle

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-003'; -- 4 cup holder

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-004'; -- 4 holder + handle

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-009'; -- Bleach

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-010'; -- Dark choc

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-011'; -- Fork

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-014'; -- Knife

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-031'; -- Coffee cleaner

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-037'; -- Clear cup 12 oz

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-038'; -- Clear cup 16 oz

UPDATE items SET cbm_per_carton = NULL -- ← REPLACE with actual CBM value
WHERE sku = 'SUP-035'; -- Clear cup 2 oz

-- ── VALIDATION AFTER ─────────────────────────────────────────────
-- Run this after applying to confirm coverage (expect 12):
-- SELECT sku, name, cbm_per_carton
-- FROM items
-- WHERE sku IN (
--   'SUP-001','SUP-002','SUP-003','SUP-004','SUP-009',
--   'SUP-010','SUP-011','SUP-014','SUP-031','SUP-037',
--   'SUP-038','SUP-035'
-- )
-- ORDER BY sku;


-- ⚠️ Important note for Abubeckr: The 12 SKUs above are my best guess based on the SUP- category. When Naji provides the invoice, verify the SKUs match and swap any that don't before merging. The placeholders are NULL so applying this accidentally does nothing harmful — but don't merge until all 12 values are filled in.