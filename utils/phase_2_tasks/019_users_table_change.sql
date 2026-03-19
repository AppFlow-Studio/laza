-- ─── NEW: user_location_assignments junction table ────────────────────────────
CREATE TABLE user_location_assignments (
                                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                           user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                           location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
                                           created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                           UNIQUE(user_id, location_id)
);

-- Index for fast lookups both ways
CREATE INDEX ON user_location_assignments (user_id);
CREATE INDEX ON user_location_assignments (location_id);

-- RLS
ALTER TABLE user_location_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access" ON user_location_assignments
    FOR ALL USING (is_super_admin());

CREATE POLICY "Admin read own assignments" ON user_location_assignments
    FOR SELECT USING (
                          get_user_role((auth.jwt() ->> 'sub'::text)) IN ('admin', 'super_admin')
                          );

-- Also drop the array column we added yesterday since we no longer need it
ALTER TABLE users DROP COLUMN IF EXISTS assigned_location_ids;