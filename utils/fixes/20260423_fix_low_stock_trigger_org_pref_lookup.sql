-- FIX: check_low_stock_with_notifications preference lookup
--
-- Bug: the trigger queried notification_preferences WHERE organization_id = v_organization_id
-- with no location_id filter. If a store-specific preference row existed in the table,
-- PostgreSQL could return it instead of the org-wide row, causing the notifications_enabled
-- / low_stock_alerts_enabled check to silently drop warehouse alerts before the edge
-- function was ever invoked.
--
-- Fix: add AND location_id IS NULL so the trigger always gates on the org-wide preference
-- row. The edge function already handles location-specific routing after being called
-- (using org-wide prefs for warehouse alerts, location-specific for store alerts).

CREATE OR REPLACE FUNCTION "public"."check_low_stock_with_notifications"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$DECLARE
    min_qty NUMERIC(10, 2);
    item_record RECORD;
    v_alert_id bigint;
    v_organization_id TEXT;
    v_delivery_mode TEXT;
    v_notifications_enabled BOOLEAN;
    v_low_stock_alerts_enabled BOOLEAN;
    v_current_time TIME;
    v_quiet_start TIME;
    v_quiet_end TIME;
    v_urgency_level TEXT;
    v_threshold_record RECORD;
    v_low_threshold NUMERIC(10, 2);
    v_critical_threshold NUMERIC(10, 2);
    v_supabase_url TEXT;
    v_service_role_key TEXT;
    v_previous_quantity NUMERIC(10, 2);
BEGIN
   -- Store previous quantity
    v_previous_quantity := COALESCE(OLD.current_quantity, NEW.current_quantity);

    -- Get item details and storage space specific override
    SELECT
        i.min_quantity,
        il.min_quantity_override,
        i.organization_id
    INTO item_record
    FROM items i
    LEFT JOIN item_locations il ON
        il.item_id::bigint = i.id::bigint
        AND il.location_id = NEW.location_id
        AND il.storage_space_id = NEW.storage_space_id
    WHERE i.id::bigint = NEW.item_id::bigint;
    v_organization_id := item_record.organization_id::TEXT;

    -- Use override if exists, otherwise use item default, otherwise 0
    min_qty := COALESCE(item_record.min_quantity_override, item_record.min_quantity, 0);

    -- Check if quantity is below minimum
    -- Only create alerts for items with storage_space_id
    IF NEW.current_quantity <= min_qty AND NEW.storage_space_id IS NOT NULL THEN
        -- Create or update alert with storage_space_id
        INSERT INTO alerts (item_id, location_id, storage_space_id, alert_type, triggered_at, organization_id)
        VALUES (NEW.item_id::bigint, NEW.location_id, NEW.storage_space_id, 'low_stock', NOW(), v_organization_id )
        ON CONFLICT (item_id, location_id, storage_space_id, alert_type)
        WHERE resolved_at IS NULL AND storage_space_id IS NOT NULL
DO UPDATE SET
    triggered_at = NOW(),
    resolved_at = NULL
RETURNING id INTO v_alert_id;

        -- Check org-wide notification preferences (location_id IS NULL = org-wide default row).
        -- Using org-wide prefs here ensures store-level preference overrides cannot silently
        -- suppress warehouse alerts. The edge function handles per-location routing after
        -- being invoked.
        SELECT
            notifications_enabled,
            low_stock_alerts_enabled,
            low_stock_delivery_mode,
            quiet_hours_start,
            quiet_hours_end
        INTO v_notifications_enabled, v_low_stock_alerts_enabled, v_delivery_mode, v_quiet_start, v_quiet_end
        FROM notification_preferences
        WHERE organization_id = v_organization_id
          AND location_id IS NULL;

        -- Only proceed if notifications are enabled
        IF COALESCE(v_notifications_enabled, false) AND COALESCE(v_low_stock_alerts_enabled, false) THEN
            -- Calculate urgency level
            -- First, try to get custom thresholds from low_stock_thresholds table
            SELECT low_threshold, critical_threshold INTO v_low_threshold, v_critical_threshold
            FROM low_stock_thresholds
            WHERE organization_id = v_organization_id
                AND (
                    (item_id = NEW.item_id) OR
                    (category_id::bigint = (SELECT category_id::bigint FROM items WHERE id = NEW.item_id) AND item_id IS NULL) OR
                    (location_id = NEW.location_id AND item_id IS NULL AND category_id IS NULL)
                )
                AND is_active = true
            ORDER BY
                CASE WHEN item_id IS NOT NULL THEN 1 ELSE 2 END,
                CASE WHEN category_id IS NOT NULL THEN 1 ELSE 2 END
            LIMIT 1;

            -- If no custom threshold found, use the item's min_quantity as the low threshold
            IF v_low_threshold IS NULL THEN
                v_low_threshold := min_qty;
                IF min_qty > 0 THEN
                    v_critical_threshold := min_qty * 0.5;
                ELSE
                    v_critical_threshold := NULL;
                END IF;
            END IF;

            -- Determine urgency based on thresholds
            IF NEW.current_quantity <= 0 THEN
                v_urgency_level := 'out_of_stock';
            ELSIF v_critical_threshold IS NOT NULL AND NEW.current_quantity <= v_critical_threshold THEN
                v_urgency_level := 'critical';
            ELSE
                v_urgency_level := 'low';
            END IF;

            -- Default delivery mode to 'immediate' if not set
            v_delivery_mode := COALESCE(v_delivery_mode, 'immediate');

            -- Check delivery mode and queue/send accordingly
            IF v_delivery_mode = 'immediate' OR v_delivery_mode = 'both' THEN
                -- Check quiet hours
                v_current_time := NOW();
                IF (v_quiet_start IS NULL OR v_quiet_end IS NULL) OR
                   NOT (v_current_time >= v_quiet_start AND v_current_time <= v_quiet_end) THEN
                    -- Queue for immediate sending (will be handled by application layer)
                      PERFORM queue_low_stock_alert(
                        v_alert_id,
                        NEW.item_id,
                        NEW.location_id,
                        NEW.storage_space_id,
                        v_urgency_level,
                        NEW.current_quantity,
                        v_previous_quantity,
                        min_qty
                    );

                    -- Attempt to call edge function for immediate send (best-effort)
                    BEGIN
                            PERFORM net.http_post(
                                url := 'https://egvvoomdtysbpnstlram.supabase.co/functions/v1/send-low-stock-alert',
                                headers := jsonb_build_object(
                                    'Content-Type', 'application/json'
                                ),
                               body := jsonb_build_object(
                                    'alert_id', v_alert_id,
                                    'item_id', NEW.item_id,
                                    'location_id', NEW.location_id,
                                    'storage_space_id', NEW.storage_space_id,
                                    'organization_id', v_organization_id,
                                    'urgency_level', v_urgency_level,
                                    'current_quantity', NEW.current_quantity,
                                    'previous_quantity', COALESCE(OLD.current_quantity, NEW.current_quantity),
                                    'min_quantity', min_qty
                                )::jsonb
                            );
                   EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'http_post failed: %', SQLERRM;
END;
                END IF;
            END IF;

            IF v_delivery_mode = 'digest' OR v_delivery_mode = 'both' THEN
                -- Always queue for digest
                  PERFORM queue_low_stock_alert(
                        v_alert_id,
                        NEW.item_id,
                        NEW.location_id,
                        NEW.storage_space_id,
                        v_urgency_level,
                        NEW.current_quantity,
                        v_previous_quantity,
                        min_qty
                    );
                RAISE log 'Queued For Low Stock Digest %', NEW.item_id;
            END IF;
        END IF;
    ELSE
        -- Resolve existing alert if quantity is now above minimum
        UPDATE alerts
        SET resolved_at = NOW()
        WHERE item_id = NEW.item_id
            AND location_id = NEW.location_id
            AND storage_space_id = NEW.storage_space_id
            AND alert_type = 'low_stock'
            AND resolved_at IS NULL;
    END IF;

    RETURN NEW;
END;$$;
