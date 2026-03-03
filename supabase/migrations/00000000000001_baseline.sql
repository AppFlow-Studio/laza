


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."are_low_stock_alerts_enabled"("p_organization_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT low_stock_alerts_enabled INTO v_enabled
    FROM notification_preferences
    WHERE organization_id = p_organization_id;
    
    RETURN COALESCE(v_enabled, false);
END;
$$;


ALTER FUNCTION "public"."are_low_stock_alerts_enabled"("p_organization_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."are_notifications_enabled"("p_organization_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT notifications_enabled INTO v_enabled
    FROM notification_preferences
    WHERE organization_id = p_organization_id;
    
    RETURN COALESCE(v_enabled, false);
END;
$$;


ALTER FUNCTION "public"."are_notifications_enabled"("p_organization_id" "text") OWNER TO "postgres";


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
        
        -- Get organization_id
        
        -- Check notification preferences
        SELECT 
            notifications_enabled,
            low_stock_alerts_enabled,
            low_stock_delivery_mode,
            quiet_hours_start,
            quiet_hours_end
        INTO v_notifications_enabled, v_low_stock_alerts_enabled, v_delivery_mode, v_quiet_start, v_quiet_end
        FROM notification_preferences
        WHERE organization_id = v_organization_id;
        
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
            -- min_qty was already calculated earlier from COALESCE(min_quantity_override, min_quantity, 0)
            IF v_low_threshold IS NULL THEN
                -- No custom threshold, use item's min_quantity as low threshold
                v_low_threshold := min_qty;
                -- Critical threshold will be 50% of low threshold (or NULL if min_qty is 0)
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


ALTER FUNCTION "public"."check_low_stock_with_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_scheduled_emails"() RETURNS TABLE("organization_id" "text", "email_type" "text", "triggered" boolean)
    LANGUAGE "plpgsql"
    AS $$DECLARE
    rec RECORD;
    v_org_current_time TIME;
    v_org_current_date DATE;
    v_org_day_of_week INTEGER;
    v_schedule_time TIME;
    v_time_window_start TIME;
    v_time_window_end TIME;
    v_has_queued_alerts BOOLEAN;
    v_already_sent BOOLEAN;
    v_supabase_url TEXT;
    v_service_role_key TEXT;
BEGIN
    -- Loop through all organizations with notifications enabled
    FOR rec IN 
        SELECT 
            np.organization_id,
            np.timezone,
            np.notifications_enabled,
            np.low_stock_alerts_enabled,
            np.daily_summary_enabled,
            np.low_stock_delivery_mode,
            np.low_stock_digest_schedule,
            np.daily_summary_schedule,
            np.daily_summary_days
        FROM notification_preferences np
        WHERE np.notifications_enabled = true
    LOOP
        -- Calculate current time in organization's timezone
        v_org_current_time := (NOW() AT TIME ZONE COALESCE(rec.timezone, 'America/New_York'))::TIME;
        v_org_current_date := (NOW() AT TIME ZONE COALESCE(rec.timezone, 'America/New_York'))::DATE;
        v_org_day_of_week := EXTRACT(DOW FROM NOW() AT TIME ZONE COALESCE(rec.timezone, 'America/New_York'));
        
        -- Define 15-minute window for matching
        v_time_window_start := v_org_current_time - INTERVAL '1 minute';
        v_time_window_end := v_org_current_time + INTERVAL '14 minutes';

        RAISE log 'time_window_start %', v_time_window_start;
        -- ====================================================================
        -- Check Low Stock Digest
        -- ====================================================================
        IF rec.low_stock_alerts_enabled = true 
           AND rec.low_stock_delivery_mode IN ('digest', 'both')
           AND rec.low_stock_digest_schedule IS NOT NULL THEN
            
            v_schedule_time := rec.low_stock_digest_schedule;
            RAISE log 'Schedule Time %', v_schedule_time;

            -- Check if we're in the schedule window
            IF v_schedule_time >= v_time_window_start AND v_schedule_time <= v_time_window_end THEN
                -- Check if already sent today
                SELECT EXISTS (
                    SELECT 1 FROM email_schedule_log esl
                        WHERE esl.organization_id = rec.organization_id
                          AND esl.email_type = 'low_stock_digest'
                          AND esl.scheduled_date = v_org_current_date
                ) INTO v_already_sent;
                
                IF NOT v_already_sent THEN
                    -- Check if there are unprocessed alerts
                    SELECT EXISTS (
                        SELECT 1 FROM low_stock_notification_queue q
                        WHERE q.organization_id = rec.organization_id
                          AND q.notification_sent = false
                          AND q.processed_at IS NULL
                    ) INTO v_has_queued_alerts;
                    RAISE log 'Queued Alerts Time %', v_has_queued_alerts;

                    IF v_has_queued_alerts THEN
                        -- Trigger the edge function

                            BEGIN
                                PERFORM net.http_post(
                                    url := 'https://egvvoomdtysbpnstlram.supabase.co/functions/v1/send-low-stock-digest',
                                    headers := jsonb_build_object(
                                        'Content-Type', 'application/json',
                                        'Authorization', 'Bearer ' || v_service_role_key
                                    ),
                                    body := jsonb_build_object(
                                        'organization_id', rec.organization_id
                                    )::jsonb
                                );
                                
                                -- Log the schedule
                                INSERT INTO email_schedule_log (organization_id, email_type, scheduled_date, scheduled_time)
                                VALUES (rec.organization_id, 'low_stock_digest', v_org_current_date, v_schedule_time);
                                
                                organization_id := rec.organization_id;
                                email_type := 'low_stock_digest';
                                triggered := true;
                                RETURN NEXT;
                            EXCEPTION WHEN OTHERS THEN
                                -- Log error but continue
                                NULL;
                            END;
                       
                    END IF;
                END IF;
            END IF;
        END IF;

        -- ====================================================================
        -- Check Daily Summary
        -- ====================================================================
         IF rec.daily_summary_enabled = true 
           AND rec.daily_summary_schedule IS NOT NULL THEN
            
            v_schedule_time := rec.daily_summary_schedule;
            RAISE LOG 'Daily Summary Schedule Time %', v_schedule_time;
            RAISE LOG 'v_org_day_of_week %', v_org_day_of_week;
            -- Check if today is in the scheduled days
            IF rec.daily_summary_days @> jsonb_build_array(v_org_day_of_week) THEN

                RAISE LOG 'v_org_day_of_week %', v_org_day_of_week;
                -- Check if we're in the schedule window
                IF v_schedule_time >= v_time_window_start AND v_schedule_time <= v_time_window_end THEN
                    -- Check if already sent today
                    SELECT EXISTS (
                        SELECT 1 FROM email_schedule_log esl
                        WHERE esl.organization_id = rec.organization_id
                          AND esl.email_type = 'daily_summary'
                          AND esl.scheduled_date = v_org_current_date
                    ) INTO v_already_sent;
                        RAISE LOG 'Daily Summary v_already_sent %', v_already_sent;
                    IF NOT v_already_sent THEN
                        -- Trigger the edge function
                      
                            BEGIN
                                PERFORM net.http_post(
                                    url := 'https://egvvoomdtysbpnstlram.supabase.co/functions/v1/send-daily-summary',
                                    headers := jsonb_build_object(
                                        'Content-Type', 'application/json'
                                    ),
                                    body := jsonb_build_object(
                                        'organization_id', rec.organization_id,
                                        'date', (NOW() AT TIME ZONE COALESCE(rec.timezone, 'America/New_York'))::DATE
                                    )::jsonb
                                );
                                
                                -- Log the schedule
                                INSERT INTO email_schedule_log (organization_id, email_type, scheduled_date, scheduled_time)
                                VALUES (rec.organization_id, 'daily_summary', v_org_current_date, v_schedule_time);
                                
                                organization_id := rec.organization_id;
                                email_type := 'daily_summary';
                                triggered := true;
                                RETURN NEXT;
                            EXCEPTION WHEN OTHERS THEN
                                -- Log error but continue
                                NULL;
                            END;
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RETURN;
END;$$;


ALTER FUNCTION "public"."check_scheduled_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_notification_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO notification_preferences (organization_id, primary_email, notifications_enabled)
    VALUES (NEW.id, '', false)
    ON CONFLICT (organization_id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_notification_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_summary_data"("p_organization_id" "text", "p_date" "date" DEFAULT CURRENT_DATE, "p_locations_to_include" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS json
    LANGUAGE "plpgsql"
    AS $$DECLARE
    v_result JSON;
    v_org_name TEXT;
    v_updated_items JSON;
    v_low_stock_items JSON;
    v_employee_activity JSON;
    v_storage_utilization JSON;
    v_comparison_metrics JSON;
    v_trending_items JSON;
    v_date_start TIMESTAMPTZ;
    v_date_end TIMESTAMPTZ;
    v_prev_date_start TIMESTAMPTZ;
    v_prev_date_end TIMESTAMPTZ;
    v_week_ago_start TIMESTAMPTZ;
    v_week_ago_end TIMESTAMPTZ;
BEGIN
    -- Get organization name
    SELECT name INTO v_org_name FROM organizations WHERE id = p_organization_id;
    
    -- Calculate 24-hour window: p_date is the end date, calculate start as 24 hours before
    -- Use end of day for p_date
    v_date_end := (p_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMPTZ;
    v_date_start := (p_date - INTERVAL '24 hours')::TIMESTAMPTZ;
    
    -- Previous day window (for comparison)
    v_prev_date_end := (p_date - INTERVAL '1 second')::TIMESTAMPTZ;
    v_prev_date_start := (p_date - INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMPTZ;
    
    -- Week ago window (for week-over-week comparison)
    v_week_ago_end := (p_date - INTERVAL '7 days' - INTERVAL '1 second')::TIMESTAMPTZ;
    v_week_ago_start := (p_date - INTERVAL '8 days' - INTERVAL '1 second')::TIMESTAMPTZ;
    
    -- Get items updated in last 24 hours with before/after quantities from inventory_logs
    SELECT json_agg(updates) INTO v_updated_items
    FROM (
        SELECT 
            il.item_id::TEXT as item_id,
            i.name as item_name,
            il.previous_quantity,
            il.new_quantity,
            il.quantity_change as change,
            COALESCE(u.email, u.id::TEXT, 'System') as updated_by,
            il.created_at as updated_at
        FROM inventory_logs il
        JOIN items i ON i.id = il.item_id
        JOIN locations l ON l.id = il.location_id
        LEFT JOIN users u ON u.id::TEXT = il.user_id
        WHERE l.organization_id = p_organization_id
          AND il.created_at >= v_date_start
          AND il.created_at <= v_date_end
          AND (p_locations_to_include IS NULL OR array_length(p_locations_to_include, 1) IS NULL OR il.location_id = ANY(p_locations_to_include))
        ORDER BY il.created_at DESC
        LIMIT 50
    ) updates;
    
    -- Get current low stock items
    SELECT json_agg(low_stock) INTO v_low_stock_items
    FROM (
        SELECT 
            a.item_id::TEXT as item_id,
            i.name as item_name,
            il.current_quantity,
            COALESCE(il.min_quantity_override, i.min_quantity, 0) as threshold,
            CASE 
                WHEN il.current_quantity <= 0 THEN 'out_of_stock'
                WHEN il.current_quantity <= COALESCE(il.min_quantity_override, i.min_quantity, 0) * 0.5 THEN 'critical'
                ELSE 'low'
            END as urgency_level,
            l.name as location_name,
            l.id::TEXT as location_id,
            ss.name as storage_space_name,
            ss.id::TEXT as storage_space_id
        FROM alerts a
        JOIN items i ON i.id = a.item_id
        JOIN locations l ON l.id = a.location_id
        LEFT JOIN storage_spaces ss ON ss.id = a.storage_space_id
        LEFT JOIN item_locations il ON il.item_id = a.item_id 
            AND il.location_id = a.location_id 
            AND (il.storage_space_id = a.storage_space_id OR (il.storage_space_id IS NULL AND a.storage_space_id IS NULL))
        WHERE i.organization_id = p_organization_id
          AND a.alert_type = 'low_stock'
          AND a.resolved_at IS NULL
          AND (p_locations_to_include IS NULL OR array_length(p_locations_to_include, 1) IS NULL OR l.id = ANY(p_locations_to_include))
        ORDER BY 
            CASE 
                WHEN il.current_quantity <= 0 THEN 1
                WHEN il.current_quantity <= COALESCE(il.min_quantity_override, i.min_quantity, 0) * 0.5 THEN 2
                ELSE 3
            END,
            il.current_quantity ASC
        LIMIT 50
    ) low_stock;
    
    -- Get employee activity for last 24 hours
    SELECT json_agg(activity) INTO v_employee_activity
    FROM (
        SELECT 
            COALESCE(u.id::TEXT, 'system') as user_id,
            COALESCE(u.email, u.id::TEXT, 'System') as user_name,
            COUNT(*) as update_count,
            COUNT(DISTINCT il.item_id) as items_updated,
            json_agg(DISTINCT il.action_type) as action_types
        FROM inventory_logs il
        JOIN locations l ON l.id = il.location_id
        LEFT JOIN users u ON u.id::TEXT = il.user_id
        WHERE l.organization_id = p_organization_id
          AND il.created_at >= v_date_start
          AND il.created_at <= v_date_end
          AND (p_locations_to_include IS NULL OR array_length(p_locations_to_include, 1) IS NULL OR il.location_id = ANY(p_locations_to_include))
        GROUP BY u.id, u.email
        ORDER BY update_count DESC
        LIMIT 20
    ) activity;
    
 -- Get inventory matrix data (items × locations × storage spaces)
    -- Returns matrix structure: items with quantities per storage space per location
    -- Shows all items for locations that have storage spaces (similar to InventoryMatrix component)
    SELECT json_agg(matrix_row) INTO v_storage_utilization
    FROM (
        SELECT 
            i.id::TEXT as item_id,
            i.name as item_name,
            i.sku,
            i.min_quantity,
            i.unit_of_measure,
            l.id::TEXT as location_id,
            l.name as location_name,
            -- Get all storage spaces for this location with item quantities
            (
                SELECT json_agg(
                    json_build_object(
                        'storage_space_id', ss_inner.id::TEXT,
                        'storage_space_name', ss_inner.name,
                        'temperature_type', ss_inner.temperature_type,
                        'quantity', COALESCE(il_inner.current_quantity, 0),
                        'is_stored', CASE WHEN il_inner.id IS NOT NULL THEN true ELSE false END
                    ) ORDER BY ss_inner.name
                )
                FROM storage_spaces ss_inner
                LEFT JOIN item_locations il_inner ON il_inner.item_id = i.id 
                    AND il_inner.location_id = l.id 
                    AND il_inner.storage_space_id = ss_inner.id
                WHERE ss_inner.location_id = l.id
            ) as storage_spaces,
            -- Calculate total quantity across all storage spaces for this item at this location
            COALESCE((
                SELECT SUM(il_total.current_quantity)
                FROM item_locations il_total
                WHERE il_total.item_id = i.id 
                  AND il_total.location_id = l.id
            ), 0) as total_quantity
        FROM items i
        CROSS JOIN locations l
        WHERE i.organization_id = p_organization_id
          AND l.organization_id = p_organization_id
          AND (p_locations_to_include IS NULL OR array_length(p_locations_to_include, 1) IS NULL OR l.id = ANY(p_locations_to_include))
          -- Only include locations that have storage spaces
          AND EXISTS (SELECT 1 FROM storage_spaces ss_check WHERE ss_check.location_id = l.id)
        ORDER BY l.name, i.name
    ) matrix_row;   
    
    -- Get comparison metrics (today vs yesterday, week over week)
    -- Calculate quantity changes from inventory logs (sum of quantity_change)
    WITH current_period AS (
        SELECT 
            COALESCE(SUM(il.quantity_change), 0) as inventory_quantity_change,
            COUNT(DISTINCT il.id) as items_updated
        FROM inventory_logs il
        JOIN locations l ON l.id = il.location_id
        WHERE l.organization_id = p_organization_id
          AND il.created_at >= v_date_start
          AND il.created_at <= v_date_end
          AND (p_locations_to_include IS NULL OR array_length(p_locations_to_include, 1) IS NULL OR il.location_id = ANY(p_locations_to_include))
    ),
    previous_day AS (
        SELECT 
            COALESCE(SUM(il.quantity_change), 0) as inventory_quantity_change,
            COUNT(DISTINCT il.id) as items_updated
        FROM inventory_logs il
        JOIN locations l ON l.id = il.location_id
        WHERE l.organization_id = p_organization_id
          AND il.created_at >= v_prev_date_start
          AND il.created_at <= v_prev_date_end
          AND (p_locations_to_include IS NULL OR array_length(p_locations_to_include, 1) IS NULL OR il.location_id = ANY(p_locations_to_include))
    ),
    week_ago AS (
        SELECT 
            COALESCE(SUM(il.quantity_change), 0) as inventory_quantity_change,
            COUNT(DISTINCT il.id) as items_updated
        FROM inventory_logs il
        JOIN locations l ON l.id = il.location_id
        WHERE l.organization_id = p_organization_id
          AND il.created_at >= v_week_ago_start
          AND il.created_at <= v_week_ago_end
          AND (p_locations_to_include IS NULL OR array_length(p_locations_to_include, 1) IS NULL OR il.location_id = ANY(p_locations_to_include))
    )
    SELECT json_build_object(
        'todayVsYesterday', json_build_object(
            'inventoryValueChange', COALESCE((SELECT inventory_quantity_change FROM current_period), 0) - COALESCE((SELECT inventory_quantity_change FROM previous_day), 0),
            'itemsUpdatedChange', COALESCE((SELECT items_updated FROM current_period), 0) - COALESCE((SELECT items_updated FROM previous_day), 0)
        ),
        'weekOverWeek', json_build_object(
            'inventoryValueChange', COALESCE((SELECT inventory_quantity_change FROM current_period), 0) - COALESCE((SELECT inventory_quantity_change FROM week_ago), 0),
            'itemsUpdatedChange', COALESCE((SELECT items_updated FROM current_period), 0) - COALESCE((SELECT items_updated FROM week_ago), 0)
        )
    ) INTO v_comparison_metrics;
    
    -- Get trending items (largest quantity changes AND most frequent updates)
    WITH item_changes AS (
        SELECT 
            il.item_id,
            i.name as item_name,
            SUM(ABS(il.quantity_change)) as total_change,
            COUNT(*) as update_frequency,
            SUM(il.quantity_change) as net_change
        FROM inventory_logs il
        JOIN items i ON i.id = il.item_id
        JOIN locations l ON l.id = il.location_id
        WHERE l.organization_id = p_organization_id
          AND il.created_at >= v_date_start
          AND il.created_at <= v_date_end
          AND (p_locations_to_include IS NULL OR array_length(p_locations_to_include, 1) IS NULL OR il.location_id = ANY(p_locations_to_include))
        GROUP BY il.item_id, i.name
        HAVING COUNT(*) > 0
    )
    SELECT json_agg(trending) INTO v_trending_items
    FROM (
        SELECT 
            item_id::TEXT as item_id,
            item_name,
            net_change as change,
            CASE 
                WHEN net_change > 0 THEN 'up'
                WHEN net_change < 0 THEN 'down'
                ELSE 'neutral'
            END as direction,
            update_frequency,
            total_change
        FROM item_changes
        ORDER BY (total_change * update_frequency) DESC
        LIMIT 20
    ) trending;
    
    -- Build result JSON
    v_result := json_build_object(
        'organization_id', p_organization_id,
        'organization_name', v_org_name,
        'date', p_date,
        'date_range', json_build_object(
            'start', v_date_start,
            'end', v_date_end
        ),
        'summary', json_build_object(
            'updated_items', COALESCE(v_updated_items, '[]'::json),
            'low_stock_items', COALESCE(v_low_stock_items, '[]'::json),
            'employee_activity', COALESCE(v_employee_activity, '[]'::json),
            'storage_utilization', COALESCE(v_storage_utilization, '[]'::json),
            'comparison_metrics', COALESCE(v_comparison_metrics, '{}'::json),
            'trending_items', COALESCE(v_trending_items, '[]'::json),
            'low_stock_count', COALESCE(json_array_length(v_low_stock_items), 0),
            'updated_items_count', COALESCE(json_array_length(v_updated_items), 0)
        )
    );
    
    RETURN v_result;
END;$$;


ALTER FUNCTION "public"."get_daily_summary_data"("p_organization_id" "text", "p_date" "date", "p_locations_to_include" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_claim"("claim" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT auth.jwt()->>claim;
$$;


ALTER FUNCTION "public"."get_my_claim"("claim" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_id_from_location"("p_location_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_organization_id TEXT;
BEGIN
    SELECT organization_id INTO v_organization_id
    FROM locations
    WHERE id = p_location_id;
    
    RETURN v_organization_id;
END;
$$;


ALTER FUNCTION "public"."get_organization_id_from_location"("p_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_digest_items"("p_organization_id" "text") RETURNS TABLE("queue_id" "uuid", "alert_id" bigint, "item_id" bigint, "item_name" "text", "item_sku" "text", "item_unit" "text", "location_id" "uuid", "location_name" "text", "storage_space_id" "uuid", "storage_space_name" "text", "urgency_level" "text", "current_quantity" numeric, "previous_quantity" numeric, "min_quantity" numeric, "quantity_change" numeric, "queued_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as queue_id,
        q.alert_id,
        q.item_id,
        i.name as item_name,
        i.sku as item_sku,
        i.unit_of_measure as item_unit,
        q.location_id,
        l.name as location_name,
        q.storage_space_id,
        ss.name as storage_space_name,
        q.urgency_level,
        q.current_quantity,
        q.previous_quantity,
        q.min_quantity,
        COALESCE(q.previous_quantity, q.current_quantity) - q.current_quantity as quantity_change,
        q.queued_at
    FROM low_stock_notification_queue q
    JOIN items i ON i.id = q.item_id
    JOIN locations l ON l.id = q.location_id
    LEFT JOIN storage_spaces ss ON ss.id = q.storage_space_id
    WHERE q.organization_id = p_organization_id
      AND q.notification_sent = false
      AND q.processed_at IS NULL
    ORDER BY 
        CASE q.urgency_level 
            WHEN 'out_of_stock' THEN 1 
            WHEN 'critical' THEN 2 
            ELSE 3 
        END,
        q.queued_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_pending_digest_items"("p_organization_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_time_window_bounds"("p_time_window_start" time without time zone, "p_time_window_end" time without time zone, "p_reference_time" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("window_start" timestamp with time zone, "window_end" timestamp with time zone)
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    v_current_date DATE;
    v_window_start TIMESTAMPTZ;
    v_window_end TIMESTAMPTZ;
BEGIN
    v_current_date := DATE(p_reference_time);
    
    -- If end time is less than start time, it's a cross-day window
    IF p_time_window_end < p_time_window_start THEN
        -- Check if current time is before the end time (meaning we're in the previous day's window)
    IF (p_reference_time::time < p_time_window_end::time) THEN
            -- We're in the window that started yesterday
            v_window_start := (v_current_date - INTERVAL '1 day')::DATE + p_time_window_start;
            v_window_end := v_current_date + p_time_window_end;
        ELSE
            -- We're in the window that started today
            v_window_start := v_current_date + p_time_window_start;
            v_window_end := (v_current_date + INTERVAL '1 day')::DATE + p_time_window_end;
        END IF;
    ELSE
        -- Normal same-day window
        v_window_start := v_current_date + p_time_window_start;
        v_window_end := v_current_date + p_time_window_end;
    END IF;
    
    RETURN QUERY SELECT v_window_start, v_window_end;
END;
$$;


ALTER FUNCTION "public"."get_time_window_bounds"("p_time_window_start" time without time zone, "p_time_window_end" time without time zone, "p_reference_time" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_update_count_in_window"("p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_user_id" "text", "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_window_bounds RECORD;
    v_count INTEGER;
BEGIN
    -- Get current window bounds
    SELECT * INTO v_window_bounds
    FROM get_time_window_bounds(p_time_window_start, p_time_window_end);
    
    -- Count employee updates (not admin) in the current window
    SELECT COUNT(*) INTO v_count
    FROM inventory_logs il
    JOIN users u ON il.user_id = u.id
    WHERE il.item_id = p_item_id
      AND il.location_id = p_location_id
      AND (il.storage_space_id = p_storage_space_id OR (il.storage_space_id IS NULL AND p_storage_space_id IS NULL))
      AND il.user_id = p_user_id
      AND u.role = 'employee'
      AND il.created_at >= v_window_bounds.window_start
      AND il.created_at < v_window_bounds.window_end;
    
    RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_update_count_in_window"("p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_user_id" "text", "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_within_time_window"("p_timestamp" timestamp with time zone, "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    v_window_bounds RECORD;
BEGIN
    SELECT * INTO v_window_bounds
    FROM get_time_window_bounds(p_time_window_start, p_time_window_end, p_timestamp);
    
    RETURN p_timestamp >= v_window_bounds.window_start 
       AND p_timestamp < v_window_bounds.window_end;
END;
$$;


ALTER FUNCTION "public"."is_within_time_window"("p_timestamp" timestamp with time zone, "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_digest_items_processed"("p_organization_id" "text", "p_queue_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE low_stock_notification_queue
    SET 
        processed_at = NOW(),
        notification_sent = true
    WHERE organization_id = p_organization_id
      AND id = ANY(p_queue_ids);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."mark_digest_items_processed"("p_organization_id" "text", "p_queue_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_low_stock"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" numeric DEFAULT NULL::numeric, "p_previous_quantity" numeric DEFAULT NULL::numeric, "p_min_quantity" numeric DEFAULT NULL::numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_organization_id TEXT;
    v_queue_id UUID;
BEGIN
    -- Get organization_id from location
    v_organization_id := get_organization_id_from_location(p_location_id);
    
    -- Check if already queued for this alert today
    SELECT id INTO v_queue_id
    FROM low_stock_notification_queue
    WHERE alert_id = p_alert_id
      AND notification_sent = false
      AND processed_at IS NULL
      AND DATE(queued_at) = CURRENT_DATE;
    
    -- If already queued, update the quantities and return existing id
    IF v_queue_id IS NOT NULL THEN
        UPDATE low_stock_notification_queue
        SET current_quantity = COALESCE(p_current_quantity, current_quantity),
            previous_quantity = COALESCE(p_previous_quantity, previous_quantity),
            min_quantity = COALESCE(p_min_quantity, min_quantity),
            urgency_level = p_urgency_level
        WHERE id = v_queue_id;
        RETURN v_queue_id;
    END IF;
    
    -- Insert into queue with quantity data
    INSERT INTO low_stock_notification_queue (
        organization_id,
        alert_id,
        item_id,
        location_id,
        storage_space_id,
        urgency_level,
        current_quantity,
        previous_quantity,
        min_quantity
    )
    VALUES (
        v_organization_id,
        p_alert_id,
        p_item_id,
        p_location_id,
        p_storage_space_id,
        p_urgency_level,
        p_current_quantity,
        p_previous_quantity,
        p_min_quantity
    )
    RETURNING id INTO v_queue_id;
    
    RETURN v_queue_id;
END;
$$;


ALTER FUNCTION "public"."queue_low_stock"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" numeric, "p_previous_quantity" numeric, "p_min_quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_low_stock_alert"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" double precision DEFAULT NULL::double precision, "p_previous_quantity" numeric DEFAULT NULL::numeric, "p_min_quantity" numeric DEFAULT NULL::numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_organization_id TEXT;
    v_queue_id UUID;
BEGIN
    -- Get organization_id from location
    v_organization_id := get_organization_id_from_location(p_location_id);
    
    -- Check if already queued for this alert today
    SELECT id INTO v_queue_id
    FROM low_stock_notification_queue
    WHERE alert_id = p_alert_id
      AND notification_sent = false
      AND processed_at IS NULL
      AND DATE(queued_at) = CURRENT_DATE;
    
    -- If already queued, update the quantities and return existing id
    IF v_queue_id IS NOT NULL THEN
        UPDATE low_stock_notification_queue
        SET current_quantity = COALESCE(p_current_quantity, current_quantity),
            previous_quantity = COALESCE(p_previous_quantity, previous_quantity),
            min_quantity = COALESCE(p_min_quantity, min_quantity),
            urgency_level = p_urgency_level
        WHERE id = v_queue_id;
        RETURN v_queue_id;
    END IF;
    
    -- Insert into queue with quantity data
    INSERT INTO low_stock_notification_queue (
        organization_id,
        alert_id,
        item_id,
        location_id,
        storage_space_id,
        urgency_level,
        current_quantity,
        previous_quantity,
        min_quantity
    )
    VALUES (
        v_organization_id,
        p_alert_id,
        p_item_id,
        p_location_id,
        p_storage_space_id,
        p_urgency_level,
        p_current_quantity,
        p_previous_quantity,
        p_min_quantity
    )
    RETURNING id INTO v_queue_id;
    
    RETURN v_queue_id;
END;
$$;


ALTER FUNCTION "public"."queue_low_stock_alert"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" double precision, "p_previous_quantity" numeric, "p_min_quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."requesting_user_id"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::text;
$$;


ALTER FUNCTION "public"."requesting_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_scheduled_emails_now"() RETURNS TABLE("organization_id" "text", "email_type" "text", "triggered" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY SELECT * FROM check_scheduled_emails();
END;
$$;


ALTER FUNCTION "public"."trigger_scheduled_emails_now"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alerts" (
    "id" bigint NOT NULL,
    "item_id" bigint,
    "location_id" "uuid",
    "alert_type" "text",
    "triggered_at" "text",
    "resolved_at" timestamp with time zone,
    "notified_users" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_space_id" "uuid",
    "organization_id" "text" DEFAULT 'org_35np3xhDrzBRkcbl0rtmtl3MDeV'::"text"
);


ALTER TABLE "public"."alerts" OWNER TO "postgres";


ALTER TABLE "public"."alerts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."alerts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."category" (
    "id" bigint NOT NULL,
    "name" "text",
    "organization_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "description" "text"
);


ALTER TABLE "public"."category" OWNER TO "postgres";


ALTER TABLE "public"."category" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."category_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."daily_summary_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "include_inventory_value" boolean DEFAULT true NOT NULL,
    "include_updated_items" boolean DEFAULT true NOT NULL,
    "include_storage_utilization" boolean DEFAULT true NOT NULL,
    "include_low_stock_items" boolean DEFAULT true NOT NULL,
    "include_employee_activity" boolean DEFAULT true NOT NULL,
    "include_comparison_metrics" boolean DEFAULT true NOT NULL,
    "include_trending_items" boolean DEFAULT false NOT NULL,
    "min_significance_threshold" integer DEFAULT 10 NOT NULL,
    "summary_format" "text" DEFAULT 'detailed'::"text" NOT NULL,
    "group_by_location" boolean DEFAULT false NOT NULL,
    "locations_to_include" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "show_matrix_only_with_stock" boolean DEFAULT false NOT NULL,
    CONSTRAINT "daily_summary_preferences_summary_format_check" CHECK (("summary_format" = ANY (ARRAY['detailed'::"text", 'concise'::"text"])))
);


ALTER TABLE "public"."daily_summary_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_delivery_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "email_type" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "resend_email_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "metadata" "jsonb",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_delivery_logs_email_type_check" CHECK (("email_type" = ANY (ARRAY['low_stock_alert'::"text", 'low_stock_digest'::"text", 'daily_summary'::"text"]))),
    CONSTRAINT "email_delivery_logs_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."email_delivery_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_schedule_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "email_type" "text" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "scheduled_time" time without time zone NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "items_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_schedule_log_email_type_check" CHECK (("email_type" = ANY (ARRAY['low_stock_digest'::"text", 'daily_summary'::"text"])))
);


ALTER TABLE "public"."email_schedule_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_logs" (
    "id" bigint NOT NULL,
    "item_id" bigint,
    "location_id" "uuid",
    "storage_space_id" "uuid",
    "user_id" "text",
    "previous_quantity" double precision,
    "new_quantity" double precision,
    "quantity_change" double precision,
    "action_type" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."inventory_logs" OWNER TO "postgres";


ALTER TABLE "public"."inventory_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."item_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" bigint,
    "location_id" "uuid",
    "storage_space_id" "uuid",
    "current_quantity" double precision,
    "min_quantity_override" double precision,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_updated" timestamp with time zone,
    "organization_id" "text" DEFAULT 'org_35np3xhDrzBRkcbl0rtmtl3MDeV'::"text"
);


ALTER TABLE "public"."item_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" bigint NOT NULL,
    "organization_id" "text",
    "name" "text",
    "sku" "text",
    "unit_of_measure" "text",
    "min_quantity" double precision DEFAULT '0'::double precision,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "barcode_text" "text",
    "category_id" bigint,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."items" OWNER TO "postgres";


ALTER TABLE "public"."items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "text",
    "name" "text",
    "address" "text",
    "is_active" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."low_stock_notification_queue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "alert_id" bigint NOT NULL,
    "item_id" bigint NOT NULL,
    "location_id" "uuid" NOT NULL,
    "storage_space_id" "uuid",
    "urgency_level" "text" NOT NULL,
    "queued_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "notification_sent" boolean DEFAULT false NOT NULL,
    "current_quantity" numeric(10,2),
    "previous_quantity" numeric(10,2),
    "min_quantity" numeric(10,2),
    CONSTRAINT "low_stock_notification_queue_urgency_level_check" CHECK (("urgency_level" = ANY (ARRAY['low'::"text", 'critical'::"text", 'out_of_stock'::"text"])))
);


ALTER TABLE "public"."low_stock_notification_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."low_stock_thresholds" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "item_id" bigint,
    "category_id" "text",
    "location_id" "uuid",
    "low_threshold" numeric(10,2) NOT NULL,
    "critical_threshold" numeric(10,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_item_or_category" CHECK (((("item_id" IS NOT NULL) AND ("category_id" IS NULL)) OR (("item_id" IS NULL) AND ("category_id" IS NOT NULL))))
);


ALTER TABLE "public"."low_stock_thresholds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "user_id" "text",
    "organization_id" "text",
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "text" NOT NULL
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "text" NOT NULL,
    "primary_email" "text" NOT NULL,
    "secondary_emails" "jsonb" DEFAULT '[]'::"jsonb",
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "notifications_enabled" boolean DEFAULT true NOT NULL,
    "low_stock_alerts_enabled" boolean DEFAULT true NOT NULL,
    "daily_summary_enabled" boolean DEFAULT true NOT NULL,
    "low_stock_delivery_mode" "text" DEFAULT 'immediate'::"text" NOT NULL,
    "low_stock_digest_schedule" time without time zone,
    "daily_summary_schedule" time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    "daily_summary_days" "jsonb" DEFAULT '[1, 2, 3, 4, 5]'::"jsonb" NOT NULL,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "email_format" "text" DEFAULT 'html'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_preferences_email_format_check" CHECK (("email_format" = ANY (ARRAY['html'::"text", 'plain'::"text"]))),
    CONSTRAINT "notification_preferences_low_stock_delivery_mode_check" CHECK (("low_stock_delivery_mode" = ANY (ARRAY['immediate'::"text", 'digest'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clerk_invite_id" "text",
    "organization_id" "text",
    "email" "text",
    "status" "text",
    "role" "text",
    "clerk_user_id" "text",
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_location_id" "uuid"
);


ALTER TABLE "public"."org_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "text" NOT NULL,
    "name" "text",
    "ImageURL" "text",
    "updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "public_metadata" "jsonb"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Location Groups';



CREATE TABLE IF NOT EXISTS "public"."storage_spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid",
    "name" "text",
    "temperature_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."storage_spaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."update_limits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "storage_space_id" "uuid",
    "max_updates_per_window" integer DEFAULT 2 NOT NULL,
    "time_window_start" time without time zone DEFAULT '14:00:00'::time without time zone NOT NULL,
    "time_window_end" time without time zone DEFAULT '02:00:00'::time without time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."update_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."update_override_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "inventory_log_id" bigint NOT NULL,
    "item_id" bigint NOT NULL,
    "location_id" "uuid" NOT NULL,
    "storage_space_id" "uuid",
    "admin_user_id" "text" NOT NULL,
    "employee_user_id" "text",
    "override_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."update_override_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "avatar_url" "text",
    "public_metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "assigned_location_id" "uuid",
    "role" "text" DEFAULT ''::"text",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."role" IS 'admin | employee';



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category"
    ADD CONSTRAINT "category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_summary_preferences"
    ADD CONSTRAINT "daily_summary_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_schedule_log"
    ADD CONSTRAINT "email_schedule_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_locations"
    ADD CONSTRAINT "item_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_locations"
    ADD CONSTRAINT "item_locations_unique_item_location_storage" UNIQUE ("item_id", "location_id", "storage_space_id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."low_stock_notification_queue"
    ADD CONSTRAINT "low_stock_notification_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."low_stock_thresholds"
    ADD CONSTRAINT "low_stock_thresholds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_invites"
    ADD CONSTRAINT "org_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_spaces"
    ADD CONSTRAINT "storage_spaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."update_limits"
    ADD CONSTRAINT "unique_location_storage_space" UNIQUE ("location_id", "storage_space_id");



ALTER TABLE ONLY "public"."daily_summary_preferences"
    ADD CONSTRAINT "unique_organization_daily_summary_preferences" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "unique_organization_notification_preferences" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."email_schedule_log"
    ADD CONSTRAINT "unique_schedule_per_day" UNIQUE ("organization_id", "email_type", "scheduled_date");



ALTER TABLE ONLY "public"."update_limits"
    ADD CONSTRAINT "update_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."update_override_logs"
    ADD CONSTRAINT "update_override_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_alerts_storage_space_id" ON "public"."alerts" USING "btree" ("storage_space_id");



CREATE UNIQUE INDEX "idx_alerts_unique_unresolved" ON "public"."alerts" USING "btree" ("item_id", "location_id", "storage_space_id", "alert_type") WHERE (("resolved_at" IS NULL) AND ("storage_space_id" IS NOT NULL));



CREATE INDEX "idx_daily_summary_preferences_organization_id" ON "public"."daily_summary_preferences" USING "btree" ("organization_id");



CREATE INDEX "idx_email_delivery_logs_created_at" ON "public"."email_delivery_logs" USING "btree" ("created_at");



CREATE INDEX "idx_email_delivery_logs_email_type" ON "public"."email_delivery_logs" USING "btree" ("email_type");



CREATE INDEX "idx_email_delivery_logs_organization_id" ON "public"."email_delivery_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_email_delivery_logs_recipient_email" ON "public"."email_delivery_logs" USING "btree" ("recipient_email");



CREATE INDEX "idx_email_delivery_logs_status" ON "public"."email_delivery_logs" USING "btree" ("status");



CREATE INDEX "idx_email_schedule_log_date" ON "public"."email_schedule_log" USING "btree" ("scheduled_date");



CREATE INDEX "idx_email_schedule_log_org_type" ON "public"."email_schedule_log" USING "btree" ("organization_id", "email_type");



CREATE INDEX "idx_items_org" ON "public"."items" USING "btree" ("organization_id");



CREATE INDEX "idx_low_stock_notification_queue_notification_sent" ON "public"."low_stock_notification_queue" USING "btree" ("notification_sent") WHERE ("notification_sent" = false);



CREATE INDEX "idx_low_stock_notification_queue_organization_id" ON "public"."low_stock_notification_queue" USING "btree" ("organization_id");



CREATE INDEX "idx_low_stock_notification_queue_processed_at" ON "public"."low_stock_notification_queue" USING "btree" ("processed_at") WHERE ("processed_at" IS NULL);



CREATE INDEX "idx_low_stock_notification_queue_queued_at" ON "public"."low_stock_notification_queue" USING "btree" ("queued_at");



CREATE INDEX "idx_low_stock_thresholds_active" ON "public"."low_stock_thresholds" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_low_stock_thresholds_category_id" ON "public"."low_stock_thresholds" USING "btree" ("category_id") WHERE ("category_id" IS NOT NULL);



CREATE INDEX "idx_low_stock_thresholds_item_id" ON "public"."low_stock_thresholds" USING "btree" ("item_id") WHERE ("item_id" IS NOT NULL);



CREATE INDEX "idx_low_stock_thresholds_location_id" ON "public"."low_stock_thresholds" USING "btree" ("location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_low_stock_thresholds_organization_id" ON "public"."low_stock_thresholds" USING "btree" ("organization_id");



CREATE INDEX "idx_members_user_org" ON "public"."members" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_notification_preferences_organization_id" ON "public"."notification_preferences" USING "btree" ("organization_id");



CREATE INDEX "idx_override_logs_admin_user_id" ON "public"."update_override_logs" USING "btree" ("admin_user_id");



CREATE INDEX "idx_override_logs_created_at" ON "public"."update_override_logs" USING "btree" ("created_at");



CREATE INDEX "idx_override_logs_inventory_log_id" ON "public"."update_override_logs" USING "btree" ("inventory_log_id");



CREATE INDEX "idx_override_logs_item_id" ON "public"."update_override_logs" USING "btree" ("item_id");



CREATE INDEX "idx_override_logs_location_id" ON "public"."update_override_logs" USING "btree" ("location_id");



CREATE INDEX "idx_update_limits_active" ON "public"."update_limits" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_update_limits_location_id" ON "public"."update_limits" USING "btree" ("location_id");



CREATE INDEX "idx_update_limits_storage_space_id" ON "public"."update_limits" USING "btree" ("storage_space_id");



CREATE INDEX "idx_users_id" ON "public"."users" USING "btree" ("id");



CREATE OR REPLACE TRIGGER "check_low_stock_trigger" AFTER INSERT OR UPDATE OF "current_quantity", "min_quantity_override" ON "public"."item_locations" FOR EACH ROW EXECUTE FUNCTION "public"."check_low_stock_with_notifications"();



CREATE OR REPLACE TRIGGER "org_notification_preferences_trigger" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_notification_preferences"();



CREATE OR REPLACE TRIGGER "update_daily_summary_preferences_updated_at" BEFORE UPDATE ON "public"."daily_summary_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_low_stock_thresholds_updated_at" BEFORE UPDATE ON "public"."low_stock_thresholds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_update_limits_updated_at" BEFORE UPDATE ON "public"."update_limits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_storage_space_id_fkey" FOREIGN KEY ("storage_space_id") REFERENCES "public"."storage_spaces"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category"
    ADD CONSTRAINT "category_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_summary_preferences"
    ADD CONSTRAINT "daily_summary_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_schedule_log"
    ADD CONSTRAINT "email_schedule_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_storage_space_id_fkey" FOREIGN KEY ("storage_space_id") REFERENCES "public"."storage_spaces"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_logs"
    ADD CONSTRAINT "inventory_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_locations"
    ADD CONSTRAINT "item_locations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_locations"
    ADD CONSTRAINT "item_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_locations"
    ADD CONSTRAINT "item_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_locations"
    ADD CONSTRAINT "item_locations_storage_space_id_fkey" FOREIGN KEY ("storage_space_id") REFERENCES "public"."storage_spaces"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."low_stock_notification_queue"
    ADD CONSTRAINT "low_stock_notification_queue_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."low_stock_notification_queue"
    ADD CONSTRAINT "low_stock_notification_queue_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."low_stock_notification_queue"
    ADD CONSTRAINT "low_stock_notification_queue_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."low_stock_notification_queue"
    ADD CONSTRAINT "low_stock_notification_queue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."low_stock_notification_queue"
    ADD CONSTRAINT "low_stock_notification_queue_storage_space_id_fkey" FOREIGN KEY ("storage_space_id") REFERENCES "public"."storage_spaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."low_stock_thresholds"
    ADD CONSTRAINT "low_stock_thresholds_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."low_stock_thresholds"
    ADD CONSTRAINT "low_stock_thresholds_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."low_stock_thresholds"
    ADD CONSTRAINT "low_stock_thresholds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_invites"
    ADD CONSTRAINT "org_invites_assigned_location_id_fkey" FOREIGN KEY ("assigned_location_id") REFERENCES "public"."locations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_invites"
    ADD CONSTRAINT "org_invites_clerk_user_id_fkey" FOREIGN KEY ("clerk_user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_invites"
    ADD CONSTRAINT "org_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storage_spaces"
    ADD CONSTRAINT "storage_spaces_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."update_limits"
    ADD CONSTRAINT "update_limits_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."update_limits"
    ADD CONSTRAINT "update_limits_storage_space_id_fkey" FOREIGN KEY ("storage_space_id") REFERENCES "public"."storage_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."update_override_logs"
    ADD CONSTRAINT "update_override_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."update_override_logs"
    ADD CONSTRAINT "update_override_logs_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."update_override_logs"
    ADD CONSTRAINT "update_override_logs_inventory_log_id_fkey" FOREIGN KEY ("inventory_log_id") REFERENCES "public"."inventory_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."update_override_logs"
    ADD CONSTRAINT "update_override_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."update_override_logs"
    ADD CONSTRAINT "update_override_logs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."update_override_logs"
    ADD CONSTRAINT "update_override_logs_storage_space_id_fkey" FOREIGN KEY ("storage_space_id") REFERENCES "public"."storage_spaces"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_assigned_location_id_fkey" FOREIGN KEY ("assigned_location_id") REFERENCES "public"."locations"("id") ON UPDATE CASCADE ON DELETE SET NULL;



CREATE POLICY "Admins and employees can select item_locations in their organiz" ON "public"."item_locations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "item_locations"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))))));



CREATE POLICY "Admins and employees can update item_locations in their organiz" ON "public"."item_locations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "item_locations"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "item_locations"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))))));



CREATE POLICY "Admins can delete category in their organization" ON "public"."category" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "category"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete item_locations in their organization" ON "public"."item_locations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "item_locations"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete items in their organization" ON "public"."items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "items"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete locations in their organization" ON "public"."locations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "locations"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete storage_spaces in their organization" ON "public"."storage_spaces" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "storage_spaces"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete users in their org" ON "public"."users" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = "public"."get_my_claim"('sub'::"text")) AND ("actor"."role" = 'admin'::"text")))) AND (EXISTS ( SELECT 1
   FROM ("public"."members" "actor_mem"
     JOIN "public"."members" "target_mem" ON (("actor_mem"."organization_id" = "target_mem"."organization_id")))
  WHERE (("actor_mem"."user_id" = "public"."get_my_claim"('sub'::"text")) AND ("target_mem"."user_id" = "users"."id"))))));



CREATE POLICY "Admins can insert category in their organization" ON "public"."category" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert item_locations in their organization" ON "public"."item_locations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "item_locations"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = ANY (ARRAY['admin'::"text", 'employee'::"text"]))))));



CREATE POLICY "Admins can insert items in their organization" ON "public"."items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "items"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert locations in their organization" ON "public"."locations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "locations"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert storage_spaces in their organization" ON "public"."storage_spaces" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "storage_spaces"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can select locations in their organization" ON "public"."locations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "locations"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can select storage_spaces in their organization" ON "public"."storage_spaces" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "storage_spaces"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update category in their organization" ON "public"."category" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "category"."organization_id") AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "category"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update items in their organization" ON "public"."items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "items"."organization_id") AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "items"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update locations in their organization" ON "public"."locations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "locations"."organization_id") AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "locations"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update storage_spaces in their organization" ON "public"."storage_spaces" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "storage_spaces"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."users" "u" ON (("u"."id" = "m"."user_id")))
     JOIN "public"."locations" "l" ON (("l"."id" = "storage_spaces"."location_id")))
  WHERE (("u"."id" = "public"."get_my_claim"('sub'::"text")) AND ("m"."organization_id" = "l"."organization_id") AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update users in their org" ON "public"."users" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = "public"."get_my_claim"('sub'::"text")) AND ("actor"."role" = 'admin'::"text")))) AND (EXISTS ( SELECT 1
   FROM ("public"."members" "actor_mem"
     JOIN "public"."members" "target_mem" ON (("actor_mem"."organization_id" = "target_mem"."organization_id")))
  WHERE (("actor_mem"."user_id" = "public"."get_my_claim"('sub'::"text")) AND ("target_mem"."user_id" = "users"."id")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users" "actor"
  WHERE (("actor"."id" = "public"."get_my_claim"('sub'::"text")) AND ("actor"."role" = 'admin'::"text")))) AND (EXISTS ( SELECT 1
   FROM ("public"."members" "actor_mem"
     JOIN "public"."members" "target_mem" ON (("actor_mem"."organization_id" = "target_mem"."organization_id")))
  WHERE (("actor_mem"."user_id" = "public"."get_my_claim"('sub'::"text")) AND ("target_mem"."user_id" = "users"."id"))))));



CREATE POLICY "Admins manage daily summary preferences" ON "public"."daily_summary_preferences" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "public"."get_my_claim"('sub'::"text")) AND ("users"."role" = 'admin'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."members"
          WHERE (("members"."user_id" = "users"."id") AND ("members"."organization_id" = "daily_summary_preferences"."organization_id"))))))));



CREATE POLICY "Admins manage low stock thresholds" ON "public"."low_stock_thresholds" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "public"."get_my_claim"('sub'::"text")) AND ("users"."role" = 'admin'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."members"
          WHERE (("members"."user_id" = "users"."id") AND ("members"."organization_id" = "low_stock_thresholds"."organization_id"))))))));



CREATE POLICY "Admins manage notification preferences" ON "public"."notification_preferences" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "public"."get_my_claim"('sub'::"text")) AND ("users"."role" = 'admin'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."members"
          WHERE (("members"."user_id" = "users"."id") AND ("members"."organization_id" = "notification_preferences"."organization_id"))))))));



CREATE POLICY "Admins view email delivery logs" ON "public"."email_delivery_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "public"."get_my_claim"('sub'::"text")) AND ("users"."role" = 'admin'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."members"
          WHERE (("members"."user_id" = "users"."id") AND ("members"."organization_id" = "email_delivery_logs"."organization_id"))))))));



CREATE POLICY "Admins view email schedule logs" ON "public"."email_schedule_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = ("auth"."uid"())::"text") AND ("users"."role" = 'admin'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."members"
          WHERE (("members"."user_id" = "users"."id") AND ("members"."organization_id" = "email_schedule_log"."organization_id"))))))));



CREATE POLICY "Admins view notification queue" ON "public"."low_stock_notification_queue" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "public"."get_my_claim"('sub'::"text")) AND ("users"."role" = 'admin'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."members"
          WHERE (("members"."user_id" = "users"."id") AND ("members"."organization_id" = "low_stock_notification_queue"."organization_id"))))))));



CREATE POLICY "Employees see own location items" ON "public"."item_locations" FOR SELECT USING (((("auth"."jwt"() ->> 'role'::"text") = 'employee'::"text") AND ("location_id" = (("auth"."jwt"() ->> 'assigned_location_id'::"text"))::"uuid")));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."alerts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."email_delivery_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."low_stock_notification_queue" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."org_invites" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."alerts" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."category" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."inventory_logs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."items" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."locations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."members" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."notification_preferences" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."org_invites" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."organizations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."storage_spaces" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Enable update for auth service role" ON "public"."org_invites" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable update for authenticated users only" ON "public"."alerts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Insert inventory logs" ON "public"."inventory_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role full access email schedule log" ON "public"."email_schedule_log" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_summary_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_delivery_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_schedule_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."low_stock_notification_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."low_stock_thresholds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_spaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."are_low_stock_alerts_enabled"("p_organization_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."are_low_stock_alerts_enabled"("p_organization_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."are_low_stock_alerts_enabled"("p_organization_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."are_notifications_enabled"("p_organization_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."are_notifications_enabled"("p_organization_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."are_notifications_enabled"("p_organization_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_low_stock_with_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_low_stock_with_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_low_stock_with_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_scheduled_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_scheduled_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_scheduled_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_summary_data"("p_organization_id" "text", "p_date" "date", "p_locations_to_include" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_summary_data"("p_organization_id" "text", "p_date" "date", "p_locations_to_include" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_summary_data"("p_organization_id" "text", "p_date" "date", "p_locations_to_include" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_id_from_location"("p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_id_from_location"("p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_id_from_location"("p_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_digest_items"("p_organization_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_digest_items"("p_organization_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_digest_items"("p_organization_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_time_window_bounds"("p_time_window_start" time without time zone, "p_time_window_end" time without time zone, "p_reference_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_time_window_bounds"("p_time_window_start" time without time zone, "p_time_window_end" time without time zone, "p_reference_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_time_window_bounds"("p_time_window_start" time without time zone, "p_time_window_end" time without time zone, "p_reference_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_update_count_in_window"("p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_user_id" "text", "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_update_count_in_window"("p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_user_id" "text", "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_update_count_in_window"("p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_user_id" "text", "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_within_time_window"("p_timestamp" timestamp with time zone, "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."is_within_time_window"("p_timestamp" timestamp with time zone, "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_within_time_window"("p_timestamp" timestamp with time zone, "p_time_window_start" time without time zone, "p_time_window_end" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_digest_items_processed"("p_organization_id" "text", "p_queue_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_digest_items_processed"("p_organization_id" "text", "p_queue_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_digest_items_processed"("p_organization_id" "text", "p_queue_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."queue_low_stock"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" numeric, "p_previous_quantity" numeric, "p_min_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."queue_low_stock"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" numeric, "p_previous_quantity" numeric, "p_min_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."queue_low_stock"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" numeric, "p_previous_quantity" numeric, "p_min_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."queue_low_stock_alert"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" double precision, "p_previous_quantity" numeric, "p_min_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."queue_low_stock_alert"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" double precision, "p_previous_quantity" numeric, "p_min_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."queue_low_stock_alert"("p_alert_id" bigint, "p_item_id" bigint, "p_location_id" "uuid", "p_storage_space_id" "uuid", "p_urgency_level" "text", "p_current_quantity" double precision, "p_previous_quantity" numeric, "p_min_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."requesting_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."requesting_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."requesting_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_scheduled_emails_now"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_scheduled_emails_now"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_scheduled_emails_now"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."alerts" TO "anon";
GRANT ALL ON TABLE "public"."alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."alerts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."alerts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."alerts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."alerts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."category" TO "anon";
GRANT ALL ON TABLE "public"."category" TO "authenticated";
GRANT ALL ON TABLE "public"."category" TO "service_role";



GRANT ALL ON SEQUENCE "public"."category_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."category_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_summary_preferences" TO "anon";
GRANT ALL ON TABLE "public"."daily_summary_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_summary_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."email_delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_delivery_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_schedule_log" TO "anon";
GRANT ALL ON TABLE "public"."email_schedule_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_schedule_log" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_logs" TO "anon";
GRANT ALL ON TABLE "public"."inventory_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."item_locations" TO "anon";
GRANT ALL ON TABLE "public"."item_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."item_locations" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."low_stock_notification_queue" TO "anon";
GRANT ALL ON TABLE "public"."low_stock_notification_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."low_stock_notification_queue" TO "service_role";



GRANT ALL ON TABLE "public"."low_stock_thresholds" TO "anon";
GRANT ALL ON TABLE "public"."low_stock_thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."low_stock_thresholds" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."org_invites" TO "anon";
GRANT ALL ON TABLE "public"."org_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."org_invites" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."storage_spaces" TO "anon";
GRANT ALL ON TABLE "public"."storage_spaces" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_spaces" TO "service_role";



GRANT ALL ON TABLE "public"."update_limits" TO "anon";
GRANT ALL ON TABLE "public"."update_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."update_limits" TO "service_role";



GRANT ALL ON TABLE "public"."update_override_logs" TO "anon";
GRANT ALL ON TABLE "public"."update_override_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."update_override_logs" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































