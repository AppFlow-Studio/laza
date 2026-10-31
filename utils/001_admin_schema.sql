-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address JSONB NOT NULL, -- {street, city, state, zip, country}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Storage spaces table
CREATE TABLE IF NOT EXISTS storage_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  temperature_type TEXT NOT NULL CHECK (temperature_type IN ('frozen', 'refrigerated', 'dry')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id bigint PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category_id bigint REFERENCES category(id) ON DELETE CASCADE,
  unit_of_measure TEXT NOT NULL CHECK (unit_of_measure IN ('pcs', 'kg', 'liters', 'lbs', 'oz')),
  min_quantity NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item locations junction table
CREATE TABLE IF NOT EXISTS item_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id bigint REFERENCES items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  storage_space_id UUID REFERENCES storage_spaces(id) ON DELETE SET NULL,
  current_quantity NUMERIC(10, 2) DEFAULT 0,
  min_quantity_override NUMERIC(10, 2),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, location_id, storage_space_id)
);

-- Update users table to include admin fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS assigned_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'employee')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Inventory logs table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id bigint REFERENCES items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  storage_space_id UUID REFERENCES storage_spaces(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  previous_quantity NUMERIC(10, 2) NOT NULL,
  new_quantity NUMERIC(10, 2) NOT NULL,
  quantity_change NUMERIC(10, 2) NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('count', 'adjustment', 'received', 'used')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id bigint PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id bigint REFERENCES items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  notified_users JSONB DEFAULT '[]'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);
CREATE INDEX IF NOT EXISTS idx_storage_spaces_location_id ON storage_spaces(location_id);
CREATE INDEX IF NOT EXISTS idx_items_organization_id ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_item_locations_item_id ON item_locations(item_id);
CREATE INDEX IF NOT EXISTS idx_item_locations_location_id ON item_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_item_locations_storage_space_id ON item_locations(storage_space_id);
CREATE INDEX IF NOT EXISTS idx_users_assigned_location_id ON users(assigned_location_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_id ON inventory_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_location_id ON inventory_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_item_id ON alerts(item_id);
CREATE INDEX IF NOT EXISTS idx_alerts_location_id ON alerts(location_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_at ON alerts(resolved_at) WHERE resolved_at IS NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_spaces_updated_at BEFORE UPDATE ON storage_spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check and create low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  min_qty NUMERIC(10, 2);
  item_record RECORD;
BEGIN
  -- Get item details
  SELECT i.min_quantity, il.min_quantity_override INTO item_record
  FROM items i
  LEFT JOIN item_locations il ON il.item_id = i.id AND il.location_id = NEW.location_id
  WHERE i.id = NEW.item_id;

  -- Use override if exists, otherwise use item default
  min_qty := COALESCE(item_record.min_quantity_override, item_record.min_quantity, 0);

  -- Check if quantity is below minimum
  IF NEW.current_quantity < min_qty THEN
    -- Create or update alert
    INSERT INTO alerts (item_id, location_id, alert_type, triggered_at)
    VALUES (NEW.item_id, NEW.location_id, 'low_stock', NOW())
    ON CONFLICT DO NOTHING;
  ELSE
    -- Resolve existing alert if quantity is now above minimum
    UPDATE alerts
    SET resolved_at = NOW()
    WHERE item_id = NEW.item_id
      AND location_id = NEW.location_id
      AND alert_type = 'low_stock'
      AND resolved_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check low stock on item_locations update
CREATE TRIGGER check_low_stock_trigger
AFTER INSERT OR UPDATE OF current_quantity ON item_locations
FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins full access" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins full access" ON locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins full access" ON storage_spaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins full access" ON items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins full access" ON item_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins full access" ON inventory_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins full access" ON alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Employees can read their assigned location data
CREATE POLICY "Employees read assigned location" ON locations
  FOR SELECT USING (
    id = (SELECT assigned_location_id FROM users WHERE id = auth.uid()::text)
  );

CREATE POLICY "Employees read assigned location items" ON item_locations
  FOR SELECT USING (
    location_id = (SELECT assigned_location_id FROM users WHERE id = auth.uid()::text)
  );

CREATE POLICY "Employees update assigned location inventory" ON item_locations
  FOR UPDATE USING (
    location_id = (SELECT assigned_location_id FROM users WHERE id = auth.uid()::text)
  );

CREATE POLICY "Employees insert inventory logs" ON inventory_logs
  FOR INSERT WITH CHECK (
    location_id = (SELECT assigned_location_id FROM users WHERE id = auth.uid()::text)
  );

