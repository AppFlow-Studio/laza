-- Update Limits System Migration
-- Creates tables and functions for limiting inventory updates per day

-- Update limits table - stores limit configuration per location and storage space
CREATE TABLE IF NOT EXISTS update_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    storage_space_id UUID REFERENCES storage_spaces(id) ON DELETE CASCADE,
    max_updates_per_window INTEGER NOT NULL DEFAULT 2,
    time_window_start TIME NOT NULL DEFAULT '00:00:00',
    time_window_end TIME NOT NULL DEFAULT '23:59:59',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint: one limit per location/storage_space combination
    -- NULL storage_space_id means location-wide default
    CONSTRAINT unique_location_storage_space UNIQUE (location_id, storage_space_id)
);

-- Update override logs table - tracks admin overrides for audit
CREATE TABLE IF NOT EXISTS update_override_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_log_id UUID NOT NULL REFERENCES inventory_logs(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    storage_space_id UUID REFERENCES storage_spaces(id) ON DELETE SET NULL,
    admin_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    override_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_update_limits_location_id ON update_limits(location_id);
CREATE INDEX IF NOT EXISTS idx_update_limits_storage_space_id ON update_limits(storage_space_id);
CREATE INDEX IF NOT EXISTS idx_update_limits_active ON update_limits(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_override_logs_inventory_log_id ON update_override_logs(inventory_log_id);
CREATE INDEX IF NOT EXISTS idx_override_logs_item_id ON update_override_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_override_logs_location_id ON update_override_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_override_logs_admin_user_id ON update_override_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_override_logs_created_at ON update_override_logs(created_at);

-- Function to calculate current time window start and end timestamps
-- Handles cross-day windows (e.g., 6 AM to 6 AM next day)
CREATE OR REPLACE FUNCTION get_time_window_bounds(
    p_time_window_start TIME,
    p_time_window_end TIME,
    p_reference_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ
) AS $$
DECLARE
    v_current_date DATE;
    v_window_start TIMESTAMPTZ;
    v_window_end TIMESTAMPTZ;
BEGIN
    v_current_date := DATE(p_reference_time);
    
    -- If end time is less than start time, it's a cross-day window
    IF p_time_window_end < p_time_window_start THEN
        -- Check if current time is before the end time (meaning we're in the previous day's window)
        IF TIME(p_reference_time) < p_time_window_end THEN
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if a timestamp is within a time window
CREATE OR REPLACE FUNCTION is_within_time_window(
    p_timestamp TIMESTAMPTZ,
    p_time_window_start TIME,
    p_time_window_end TIME
) RETURNS BOOLEAN AS $$
DECLARE
    v_window_bounds RECORD;
BEGIN
    SELECT * INTO v_window_bounds
    FROM get_time_window_bounds(p_time_window_start, p_time_window_end, p_timestamp);
    
    RETURN p_timestamp >= v_window_bounds.window_start 
       AND p_timestamp < v_window_bounds.window_end;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get update count for an item in current time window
CREATE OR REPLACE FUNCTION get_update_count_in_window(
    p_item_id UUID,
    p_location_id UUID,
    p_storage_space_id UUID,
    p_user_id TEXT,
    p_time_window_start TIME,
    p_time_window_end TIME
) RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_update_limits_updated_at
    BEFORE UPDATE ON update_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

