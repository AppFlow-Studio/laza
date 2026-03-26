-- ============================================================
-- D4 — Update receive_shipment_to_pallets RPC for box_configs
-- Migration: 010_receive_shipment_box_configs
-- Depends on: D1 (po_item_box_configs), D2 (has_mixed_configs)
-- ============================================================
--
-- NEW p_pallet_assignments format (per item):
--
--   [{
--     pallet_label: "P-001",
--     storage_space_id: "...",          -- optional
--     items: [{
--       item_id: 5,
--       purchase_order_item_id: "...",  -- optional (NULL for local items)
--       box_configs: [                  -- NEW: replaces single pieces_per_box
--         { pieces_per_box: 7000, box_count: 4 },
--         { pieces_per_box: 5000, box_count: 6 }
--       ],
--       pieces_per_box_override: null   -- still accepted for local items with no PO
--     }]
--   }]
--
-- BACKWARDS COMPAT: if an item has no box_configs array but has a
-- top-level pieces_per_box field (old format), it is wrapped into a
-- single-element box_configs array automatically so existing callers
-- keep working without changes.
-- ============================================================

CREATE OR REPLACE FUNCTION receive_shipment_to_pallets(
  p_purchase_order_id   UUID,
  p_pallet_assignments  JSONB,
  p_user_id             TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- PO / org context
  v_org_id              TEXT;
  v_warehouse_loc_id    UUID;

  -- Loop iterators
  v_pallet_json         JSONB;
  v_item_json           JSONB;
  v_config_json         JSONB;

  -- Per-pallet
  v_pallet_label        TEXT;
  v_storage_space_id    UUID;
  v_pallet_id           UUID;

  -- Per-item
  v_item_id             BIGINT;
  v_poi_id              UUID;
  v_box_configs         JSONB;
  v_ppb_override        INTEGER;

  -- Per-config
  v_pieces_per_box      INTEGER;
  v_box_count           INTEGER;
  v_total_boxes         INTEGER;  -- sum across all configs for this item

  -- Dominant config (highest box_count)
  v_dominant_ppb        INTEGER;
  v_dominant_count      INTEGER;
  v_candidate_count     INTEGER;

  -- pallet_inventory row
  v_pi_id               UUID;

  -- Result tracking
  v_pallets_created     INTEGER := 0;
  v_configs_inserted    INTEGER := 0;
  v_result              JSONB;
  v_pallet_results      JSONB := '[]'::JSONB;

BEGIN
  -- ── 0. Verify caller is super_admin ──────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: only super_admin can receive shipments';
  END IF;

  -- ── 1. Load PO context ───────────────────────────────────
  SELECT po.organization_id, l.id
    INTO v_org_id, v_warehouse_loc_id
    FROM purchase_orders po
    JOIN locations l
      ON l.organization_id = po.organization_id
     AND l.location_type = 'warehouse'
   WHERE po.id = p_purchase_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'PO_NOT_FOUND: purchase order % does not exist or has no warehouse location',
      p_purchase_order_id;
  END IF;

  -- ── 2. Validate top-level input ──────────────────────────
  IF p_pallet_assignments IS NULL OR jsonb_array_length(p_pallet_assignments) = 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT: p_pallet_assignments must be a non-empty JSON array';
  END IF;

  -- ── 3. Loop over pallets ─────────────────────────────────
  FOR v_pallet_json IN SELECT jsonb_array_elements(p_pallet_assignments)
  LOOP
    v_pallet_label     := v_pallet_json->>'pallet_label';
    v_storage_space_id := (v_pallet_json->>'storage_space_id')::UUID;

    IF v_pallet_label IS NULL OR trim(v_pallet_label) = '' THEN
      RAISE EXCEPTION 'INVALID_INPUT: every pallet entry must have a pallet_label';
    END IF;

    IF v_pallet_json->'items' IS NULL OR
       jsonb_array_length(v_pallet_json->'items') = 0 THEN
      RAISE EXCEPTION 'INVALID_INPUT: pallet % has no items', v_pallet_label;
    END IF;

    -- ── 3a. Create or reuse warehouse pallet ───────────────
    SELECT id INTO v_pallet_id
      FROM warehouse_pallets
     WHERE organization_id = v_org_id
       AND pallet_label    = v_pallet_label;

    IF v_pallet_id IS NULL THEN
      INSERT INTO warehouse_pallets (
        organization_id,
        warehouse_location_id,
        storage_space_id,
        purchase_order_id,
        pallet_label,
        status,
        received_at
      ) VALUES (
        v_org_id,
        v_warehouse_loc_id,
        v_storage_space_id,
        p_purchase_order_id,
        v_pallet_label,
        'active',
        NOW()
      )
      RETURNING id INTO v_pallet_id;

      v_pallets_created := v_pallets_created + 1;
    END IF;

    -- ── 3b. Loop over items on this pallet ─────────────────
    FOR v_item_json IN SELECT jsonb_array_elements(v_pallet_json->'items')
    LOOP
      v_item_id      := (v_item_json->>'item_id')::BIGINT;
      v_poi_id       := (v_item_json->>'purchase_order_item_id')::UUID;
      v_ppb_override := (v_item_json->>'pieces_per_box_override')::INTEGER;

      IF v_item_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_INPUT: item entry missing item_id on pallet %', v_pallet_label;
      END IF;

      -- ── Backwards compat: wrap legacy pieces_per_box + box_count ──
      IF v_item_json->'box_configs' IS NULL THEN
        IF v_item_json->>'pieces_per_box' IS NOT NULL THEN
          v_box_configs := jsonb_build_array(
            jsonb_build_object(
              'pieces_per_box', (v_item_json->>'pieces_per_box')::INTEGER,
              'box_count',      (v_item_json->>'box_count')::INTEGER
            )
          );
        ELSE
          -- Local item with only pieces_per_box_override — one implicit config
          v_box_configs := NULL;
        END IF;
      ELSE
        v_box_configs := v_item_json->'box_configs';
      END IF;

      -- ── Validate box_configs when present ─────────────────
      IF v_box_configs IS NOT NULL THEN
        IF jsonb_array_length(v_box_configs) = 0 THEN
          RAISE EXCEPTION 'INVALID_INPUT: box_configs for item % on pallet % is empty',
            v_item_id, v_pallet_label;
        END IF;

        FOR v_config_json IN SELECT jsonb_array_elements(v_box_configs)
        LOOP
          v_pieces_per_box := (v_config_json->>'pieces_per_box')::INTEGER;
          v_box_count      := (v_config_json->>'box_count')::INTEGER;

          IF v_pieces_per_box IS NULL OR v_pieces_per_box <= 0 THEN
            RAISE EXCEPTION 'INVALID_INPUT: pieces_per_box must be > 0 (item %, pallet %)',
              v_item_id, v_pallet_label;
          END IF;
          IF v_box_count IS NULL OR v_box_count <= 0 THEN
            RAISE EXCEPTION 'INVALID_INPUT: box_count must be > 0 (item %, pallet %)',
              v_item_id, v_pallet_label;
          END IF;
        END LOOP;
      END IF;

      -- ── 3c. Sum total boxes across all configs ─────────────
      IF v_box_configs IS NOT NULL THEN
        SELECT COALESCE(SUM((cfg->>'box_count')::INTEGER), 0)
          INTO v_total_boxes
          FROM jsonb_array_elements(v_box_configs) AS cfg;
      ELSE
        -- Local item: box count comes from pieces_per_box_override path;
        -- total_boxes not needed for po_item_box_configs insert
        v_total_boxes := 0;
      END IF;

      -- ── 3d. Insert pallet_inventory row ───────────────────
      INSERT INTO pallet_inventory (
        pallet_id,
        item_id,
        purchase_order_item_id,
        box_count,
        initial_box_count,
        pieces_per_box_override
      ) VALUES (
        v_pallet_id,
        v_item_id,
        v_poi_id,
        v_total_boxes,
        GREATEST(v_total_boxes, 1),   -- initial_box_count must be > 0
        v_ppb_override
      )
      ON CONFLICT (pallet_id, item_id, purchase_order_item_id)
      DO UPDATE SET
        box_count         = pallet_inventory.box_count + EXCLUDED.box_count,
        initial_box_count = pallet_inventory.initial_box_count + EXCLUDED.initial_box_count
      RETURNING id INTO v_pi_id;

      -- ── 3e. Insert po_item_box_configs rows ───────────────
      IF v_box_configs IS NOT NULL AND v_poi_id IS NOT NULL THEN

        v_dominant_ppb   := NULL;
        v_dominant_count := 0;

        FOR v_config_json IN SELECT jsonb_array_elements(v_box_configs)
        LOOP
          v_pieces_per_box := (v_config_json->>'pieces_per_box')::INTEGER;
          v_box_count      := (v_config_json->>'box_count')::INTEGER;

          INSERT INTO po_item_box_configs (
            purchase_order_item_id,
            pieces_per_box,
            box_count
          ) VALUES (
            v_poi_id,
            v_pieces_per_box,
            v_box_count
          )
          ON CONFLICT (purchase_order_item_id, pieces_per_box)
          DO UPDATE SET
            box_count = po_item_box_configs.box_count + EXCLUDED.box_count;
          -- NOTE: has_mixed_configs is auto-updated by the D2 trigger

          v_configs_inserted := v_configs_inserted + 1;

          -- Track dominant config (highest box_count wins)
          IF v_box_count > v_dominant_count THEN
            v_dominant_count := v_box_count;
            v_dominant_ppb   := v_pieces_per_box;
          END IF;
        END LOOP;

        -- ── 3f. Update purchase_order_items.pieces_per_box to dominant ──
        UPDATE purchase_order_items
           SET pieces_per_box = v_dominant_ppb
         WHERE id = v_poi_id;

        -- ── 3g. Auto-sync items.box_quantity to dominant config ──
        UPDATE items
           SET box_quantity = v_dominant_ppb
         WHERE id = v_item_id;

      END IF;

      -- ── 3h. Log pallet operation ──────────────────────────
      INSERT INTO pallet_operations_log (
        organization_id,
        pallet_id,
        operation_type,
        item_id,
        box_count_change,
        performed_by,
        notes
      ) VALUES (
        v_org_id,
        v_pallet_id,
        'loaded',
        v_item_id,
        v_total_boxes,
        p_user_id,
        format('Received via PO %s', p_purchase_order_id)
      );

    END LOOP; -- items

    -- Accumulate result per pallet
    v_pallet_results := v_pallet_results || jsonb_build_object(
      'pallet_label', v_pallet_label,
      'pallet_id',    v_pallet_id
    );

  END LOOP; -- pallets

  -- ── 4. Mark PO as received ───────────────────────────────
  UPDATE purchase_orders
     SET status     = 'received',
         updated_at = NOW()
   WHERE id = p_purchase_order_id;

  -- ── 5. Return summary ────────────────────────────────────
  v_result := jsonb_build_object(
    'success',          true,
    'purchase_order_id', p_purchase_order_id,
    'pallets_created',  v_pallets_created,
    'configs_inserted', v_configs_inserted,
    'pallets',          v_pallet_results
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE; -- re-raise with original message; transaction rolls back automatically
END;
$$;

-- ── Grant execute to authenticated users (RLS + internal super_admin
--    check inside the function are the real gatekeepers)
GRANT EXECUTE ON FUNCTION receive_shipment_to_pallets(UUID, JSONB, TEXT)
  TO authenticated;