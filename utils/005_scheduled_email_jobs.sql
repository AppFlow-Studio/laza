-- Scheduled Email Jobs Migration
-- Adds infrastructure for scheduled digest and daily summary emails

-- ============================================================================
-- 0. Add show_matrix_only_with_stock column to daily_summary_preferences
-- ============================================================================
ALTER TABLE daily_summary_preferences
ADD COLUMN IF NOT EXISTS show_matrix_only_with_stock BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 1. Add quantity tracking columns to low_stock_notification_queue
-- ============================================================================
-- These columns capture the state at queue time for displaying in digest emails

ALTER TABLE low_stock_notification_queue
ADD COLUMN IF NOT EXISTS current_quantity NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS previous_quantity NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS min_quantity NUMERIC(10, 2);

-- ============================================================================
-- 2. Email schedule log table - prevents duplicate sends
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_schedule_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL CHECK (email_type IN ('low_stock_digest', 'daily_summary')),
    scheduled_date DATE NOT NULL, -- The date this was scheduled for
    scheduled_time TIME NOT NULL, -- The time this was scheduled for
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    items_count INTEGER DEFAULT 0, -- Number of items included in the email
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_schedule_per_day UNIQUE (organization_id, email_type, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_email_schedule_log_org_type ON email_schedule_log(organization_id, email_type);
CREATE INDEX IF NOT EXISTS idx_email_schedule_log_date ON email_schedule_log(scheduled_date);

-- Enable RLS
ALTER TABLE email_schedule_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins view email schedule logs" ON email_schedule_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role = 'admin'
            AND EXISTS (
                SELECT 1 FROM members
                WHERE members.user_id = users.id
                AND members.organization_id::text = email_schedule_log.organization_id::text
            )
        )
    );

CREATE POLICY "Service role full access email schedule log" ON email_schedule_log
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. Update queue_low_stock_alert function to include quantity data
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_low_stock_alert(
    p_alert_id bigint,
    p_item_id bigint,
    p_location_id UUID,
    p_storage_space_id UUID,
    p_urgency_level TEXT,
    p_current_quantity FLOAT8 DEFAULT NULL,
    p_previous_quantity NUMERIC DEFAULT NULL,
    p_min_quantity NUMERIC DEFAULT NULL
)
RETURNS UUID 
SECURITY DEFINER
SET search_path = public
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Update check_low_stock_with_notifications to pass quantity data
-- ============================================================================

CREATE OR REPLACE FUNCTION check_low_stock_with_notifications()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
        il.item_id = i.id 
        AND il.location_id = NEW.location_id
        AND il.storage_space_id = NEW.storage_space_id
    WHERE i.id = NEW.item_id;

    -- Use override if exists, otherwise use item default, otherwise 0
    min_qty := COALESCE(item_record.min_quantity_override, item_record.min_quantity, 0);

    -- Check if quantity is below minimum
    -- Only create alerts for items with storage_space_id
    IF NEW.current_quantity <= min_qty AND NEW.storage_space_id IS NOT NULL THEN
        -- Create or update alert with storage_space_id
        INSERT INTO alerts (item_id, location_id, storage_space_id, alert_type, triggered_at)
        VALUES (NEW.item_id, NEW.location_id, NEW.storage_space_id, 'low_stock', NOW())
        ON CONFLICT (item_id, location_id, storage_space_id, alert_type) 
        WHERE resolved_at IS NULL AND storage_space_id IS NOT NULL
        DO UPDATE SET triggered_at = NOW()
        RETURNING id INTO v_alert_id;
        
        -- Get organization_id
        v_organization_id := item_record.organization_id::TEXT;
        
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
                    (category_id:bigint = (SELECT category_id::bigint FROM items WHERE id = NEW.item_id) AND item_id IS NULL) OR
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
                    -- Queue for immediate sending with quantity data
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
                -- Always queue for digest with quantity data
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
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Function to check and trigger scheduled emails
-- ============================================================================

CREATE OR REPLACE FUNCTION check_scheduled_emails()
RETURNS TABLE (
    organization_id UUID,
    email_type TEXT,
    triggered BOOLEAN
) AS $$
DECLARE
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
    -- Get configuration
    v_supabase_url := current_setting('app.supabase_url', true);
    v_service_role_key := current_setting('app.service_role_key', true);

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

        -- ====================================================================
        -- Check Low Stock Digest
        -- ====================================================================
        IF rec.low_stock_alerts_enabled = true 
           AND rec.low_stock_delivery_mode IN ('digest', 'both')
           AND rec.low_stock_digest_schedule IS NOT NULL THEN
            
            v_schedule_time := rec.low_stock_digest_schedule;
            
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
                    
                    IF v_has_queued_alerts THEN
                        -- Trigger the edge function
                        IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
                            BEGIN
                                PERFORM net.http_post(
                                    url := v_supabase_url || '/functions/v1/send-low-stock-digest',
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
        END IF;

        -- ====================================================================
        -- Check Daily Summary
        -- ====================================================================
        IF rec.daily_summary_enabled = true 
           AND rec.daily_summary_schedule IS NOT NULL THEN
            
            v_schedule_time := rec.daily_summary_schedule;
            
            -- Check if today is in the scheduled days (array contains the day value)
            IF rec.daily_summary_days @> jsonb_build_array(v_org_day_of_week) THEN
                -- Check if we're in the schedule window
                IF v_schedule_time >= v_time_window_start AND v_schedule_time <= v_time_window_end THEN
                    -- Check if already sent today
                    SELECT EXISTS (
                        SELECT 1 FROM email_schedule_log esl
                        WHERE esl.organization_id = rec.organization_id
                          AND esl.email_type = 'daily_summary'
                          AND esl.scheduled_date = v_org_current_date
                    ) INTO v_already_sent;
                    
                    IF NOT v_already_sent THEN
                        -- Trigger the edge function
                        IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
                            BEGIN
                                PERFORM net.http_post(
                                    url := v_supabase_url || '/functions/v1/send-daily-summary',
                                    headers := jsonb_build_object(
                                        'Content-Type', 'application/json',
                                        'Authorization', 'Bearer ' || v_service_role_key
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
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Enable pg_cron extension and create scheduled job
-- ============================================================================

-- Note: pg_cron must be enabled in your Supabase project settings
-- Dashboard > Database > Extensions > pg_cron

-- Create the cron job to run every 15 minutes
-- This needs to be run separately after enabling pg_cron extension
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if it exists
        PERFORM cron.unschedule('check-scheduled-emails');
        
        -- Schedule new job to run every 15 minutes
        PERFORM cron.schedule(
            'check-scheduled-emails',
            '*/15 * * * *',
            'SELECT * FROM check_scheduled_emails()'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- pg_cron not available, skip
    RAISE NOTICE 'pg_cron extension not available. Please enable it in Supabase Dashboard and run: SELECT cron.schedule(''check-scheduled-emails'', ''*/15 * * * *'', ''SELECT * FROM check_scheduled_emails()'');';
END;
$$;

-- ============================================================================
-- 7. Helper function to manually trigger scheduled email check
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_scheduled_emails_now()
RETURNS TABLE (
    organization_id UUID,
    email_type TEXT,
    triggered BOOLEAN
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM check_scheduled_emails();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Function to get pending digest items for an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_digest_items(p_organization_id text)
RETURNS TABLE (
    queue_id UUID,
    alert_id bigint,
    item_id bigint,
    item_name TEXT,
    item_sku TEXT,
    item_unit TEXT,
    location_id UUID,
    location_name TEXT,
    storage_space_id UUID,
    storage_space_name TEXT,
    urgency_level TEXT,
    current_quantity NUMERIC,
    previous_quantity NUMERIC,
    min_quantity NUMERIC,
    quantity_change NUMERIC,
    queued_at TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. Function to mark digest items as processed
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_digest_items_processed(p_organization_id UUID, p_queue_ids UUID[])
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. Function to get daily summary data for an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_summary_data(
    p_organization_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_locations_to_include UUID[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
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
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grant execute permissions to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_pending_digest_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_summary_data(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_digest_items_processed(UUID, UUID[]) TO authenticated;

