-- Email Notification System Migration
-- Creates tables and functions for email notifications

-- Notification preferences table - stores admin notification preferences per organization
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    primary_email TEXT NOT NULL,
    secondary_emails JSONB DEFAULT '[]'::jsonb,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    low_stock_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    daily_summary_enabled BOOLEAN NOT NULL DEFAULT true,
    low_stock_delivery_mode TEXT NOT NULL DEFAULT 'immediate' CHECK (low_stock_delivery_mode IN ('immediate', 'digest', 'both')),
    low_stock_digest_schedule TIME,
    daily_summary_schedule TIME NOT NULL DEFAULT '08:00:00',
    daily_summary_days JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb, -- 0=Sunday, 1=Monday, etc.
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    email_format TEXT NOT NULL DEFAULT 'html' CHECK (email_format IN ('html', 'plain')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_organization_notification_preferences UNIQUE (organization_id)
);

-- Low stock thresholds table - stores custom thresholds per item, category, or location
CREATE TABLE IF NOT EXISTS low_stock_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    category_id TEXT, -- References items.category (desserts, ingredients, supplies)
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    low_threshold NUMERIC(10, 2) NOT NULL,
    critical_threshold NUMERIC(10, 2), -- Typically 50% of low_threshold
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_item_or_category CHECK (
        (item_id IS NOT NULL AND category_id IS NULL) OR
        (item_id IS NULL AND category_id IS NOT NULL)
    )
);

-- Daily summary preferences table - stores detailed preferences for daily summary content
CREATE TABLE IF NOT EXISTS daily_summary_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    include_inventory_value BOOLEAN NOT NULL DEFAULT true,
    include_updated_items BOOLEAN NOT NULL DEFAULT true,
    include_storage_utilization BOOLEAN NOT NULL DEFAULT true,
    include_low_stock_items BOOLEAN NOT NULL DEFAULT true,
    include_employee_activity BOOLEAN NOT NULL DEFAULT true,
    include_comparison_metrics BOOLEAN NOT NULL DEFAULT true,
    include_trending_items BOOLEAN NOT NULL DEFAULT false,
    min_significance_threshold INTEGER NOT NULL DEFAULT 10,
    summary_format TEXT NOT NULL DEFAULT 'detailed' CHECK (summary_format IN ('detailed', 'concise')),
    group_by_location BOOLEAN NOT NULL DEFAULT false,
    locations_to_include JSONB DEFAULT '[]'::jsonb, -- Array of location UUIDs, empty means all
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_organization_daily_summary_preferences UNIQUE (organization_id)
);

-- Email delivery logs table - tracks all emails sent for audit and debugging
CREATE TABLE IF NOT EXISTS email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL CHECK (email_type IN ('low_stock_alert', 'low_stock_digest', 'daily_summary')),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    resend_email_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    metadata JSONB, -- Stores context like item_ids, location_ids, etc.
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Low stock notification queue table - queues low stock alerts for batch processing (digest mode)
CREATE TABLE IF NOT EXISTS low_stock_notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    storage_space_id UUID REFERENCES storage_spaces(id) ON DELETE SET NULL,
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'critical', 'out_of_stock')),
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    notification_sent BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_organization_id ON notification_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_thresholds_organization_id ON low_stock_thresholds(organization_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_thresholds_item_id ON low_stock_thresholds(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_low_stock_thresholds_category_id ON low_stock_thresholds(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_low_stock_thresholds_location_id ON low_stock_thresholds(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_low_stock_thresholds_active ON low_stock_thresholds(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_daily_summary_preferences_organization_id ON daily_summary_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_organization_id ON email_delivery_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_email_type ON email_delivery_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status ON email_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_created_at ON email_delivery_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_recipient_email ON email_delivery_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_low_stock_notification_queue_organization_id ON low_stock_notification_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_notification_queue_queued_at ON low_stock_notification_queue(queued_at);
CREATE INDEX IF NOT EXISTS idx_low_stock_notification_queue_processed_at ON low_stock_notification_queue(processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_low_stock_notification_queue_notification_sent ON low_stock_notification_queue(notification_sent) WHERE notification_sent = false;

-- Add updated_at triggers
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_low_stock_thresholds_updated_at
    BEFORE UPDATE ON low_stock_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_summary_preferences_updated_at
    BEFORE UPDATE ON daily_summary_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get organization_id from location_id
CREATE OR REPLACE FUNCTION get_organization_id_from_location(p_location_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_organization_id TEXT;
BEGIN
    SELECT organization_id INTO v_organization_id
    FROM locations
    WHERE id = p_location_id;
    
    RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get organization_id from item_id
CREATE OR REPLACE FUNCTION get_organization_id_from_item(p_item_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_organization_id TEXT;
BEGIN
    SELECT organization_id INTO v_organization_id
    FROM items
    WHERE id = p_item_id;
    
    RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if notifications are enabled for an organization
CREATE OR REPLACE FUNCTION are_notifications_enabled(p_organization_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT notifications_enabled INTO v_enabled
    FROM notification_preferences
    WHERE organization_id = p_organization_id;
    
    RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if low stock alerts are enabled for an organization
CREATE OR REPLACE FUNCTION are_low_stock_alerts_enabled(p_organization_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT low_stock_alerts_enabled INTO v_enabled
    FROM notification_preferences
    WHERE organization_id = p_organization_id;
    
    RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Auto-create default notification preferences on organization creation
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (organization_id, primary_email, notifications_enabled)
    VALUES (NEW.id, '', false)
    ON CONFLICT (organization_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_notification_preferences_trigger ON organizations;
CREATE TRIGGER org_notification_preferences_trigger
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Backfill notification_preferences for existing organizations
INSERT INTO notification_preferences (organization_id, primary_email, notifications_enabled)
SELECT id, '', false FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Function to queue low stock alert for digest
CREATE OR REPLACE FUNCTION queue_low_stock_alert(
    p_alert_id UUID,
    p_item_id UUID,
    p_location_id UUID,
    p_storage_space_id UUID,
    p_urgency_level TEXT
)
RETURNS UUID AS $$
DECLARE
    v_organization_id TEXT;
    v_queue_id UUID;
BEGIN
    -- Get organization_id from location
    v_organization_id := get_organization_id_from_location(p_location_id);
    
    -- Insert into queue
    INSERT INTO low_stock_notification_queue (
        organization_id,
        alert_id,
        item_id,
        location_id,
        storage_space_id,
        urgency_level
    )
    VALUES (
        v_organization_id,
        p_alert_id,
        p_item_id,
        p_location_id,
        p_storage_space_id,
        p_urgency_level
    )
    RETURNING id INTO v_queue_id;
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced check_low_stock function that queues notifications
-- This extends the existing function to handle email notifications
CREATE OR REPLACE FUNCTION check_low_stock_with_notifications()
RETURNS TRIGGER AS $$
DECLARE
    min_qty NUMERIC(10, 2);
    item_record RECORD;
    v_alert_id UUID;
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
BEGIN
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
                    (category_id = (SELECT category FROM items WHERE id = NEW.item_id) AND item_id IS NULL) OR
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
                v_current_time := TIME(NOW());
                IF (v_quiet_start IS NULL OR v_quiet_end IS NULL) OR
                   NOT (v_current_time >= v_quiet_start AND v_current_time <= v_quiet_end) THEN
                    -- Queue for immediate sending (will be handled by application layer)
                    PERFORM queue_low_stock_alert(
                        v_alert_id,
                        NEW.item_id,
                        NEW.location_id,
                        NEW.storage_space_id,
                        v_urgency_level
                    );

                    -- Attempt to call edge function for immediate send (best-effort)
                    BEGIN
                     
                        
                            PERFORM net.http_post(
                                url := v_supabase_url || '/functions/v1/send-low-stock-alert',
                                headers := jsonb_build_object(
                                    'Content-Type', 'application/json',
                                    'Authorization', 'Bearer ' || v_service_role_key
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
                        -- Ignore errors from http_post to avoid blocking the trigger
                        NULL;
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
                    v_urgency_level
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

-- Note: The application layer processes notifications after alerts are created
-- The existing check_low_stock() trigger creates alerts, and the app processes them
-- 
-- Switch item_locations trigger to notification-aware function
DROP TRIGGER IF EXISTS check_low_stock_trigger ON item_locations;
CREATE TRIGGER check_low_stock_trigger
AFTER INSERT OR UPDATE OF current_quantity, min_quantity_override ON item_locations
FOR EACH ROW EXECUTE FUNCTION check_low_stock_with_notifications();

-- The application layer will still process the queued notifications

-- Enable RLS on new tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage notification preferences for their organization
CREATE POLICY "Admins manage notification preferences" ON notification_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role = 'admin'
            AND EXISTS (
                SELECT 1 FROM members
                WHERE members.user_id = users.id
                AND members.organization_id::text = notification_preferences.organization_id::text
            )
        )
    );

CREATE POLICY "Admins manage low stock thresholds" ON low_stock_thresholds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role = 'admin'
            AND EXISTS (
                SELECT 1 FROM members
                WHERE members.user_id = users.id
                AND members.organization_id::text = low_stock_thresholds.organization_id::text
            )
        )
    );

CREATE POLICY "Admins manage daily summary preferences" ON daily_summary_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role = 'admin'
            AND EXISTS (
                SELECT 1 FROM members
                WHERE members.user_id = users.id
                AND members.organization_id::text = daily_summary_preferences.organization_id::text
            )
        )
    );

CREATE POLICY "Admins view email delivery logs" ON email_delivery_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role = 'admin'
            AND EXISTS (
                SELECT 1 FROM members
                WHERE members.user_id = users.id
                AND members.organization_id::text = email_delivery_logs.organization_id::text
            )
        )
    );

CREATE POLICY "Admins view notification queue" ON low_stock_notification_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role = 'admin'
            AND EXISTS (
                SELECT 1 FROM members
                WHERE members.user_id = users.id
                AND members.organization_id::text = low_stock_notification_queue.organization_id::text
            )
        )
    );

-- Service role can insert/update (for scheduled jobs and triggers)
CREATE POLICY "Service role full access notification preferences" ON notification_preferences
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access low stock thresholds" ON low_stock_thresholds
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access daily summary preferences" ON daily_summary_preferences
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access email delivery logs" ON email_delivery_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access notification queue" ON low_stock_notification_queue
    FOR ALL USING (auth.role() = 'service_role');

