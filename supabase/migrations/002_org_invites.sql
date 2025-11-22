-- Create org_invites table for tracking organization invitations
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_invite_id TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL, -- Clerk organization ID
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  clerk_user_id TEXT NULL, -- Populated when invitation is accepted
  assigned_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_invites_organization_id ON org_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON org_invites(status);
CREATE INDEX IF NOT EXISTS idx_org_invites_clerk_invite_id ON org_invites(clerk_invite_id);

-- Add updated_at trigger
CREATE TRIGGER update_org_invites_updated_at BEFORE UPDATE ON org_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view and manage invites for their organization
CREATE POLICY "Admins manage org invites" ON org_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.user_id = users.id
        AND members.organization_id = org_invites.organization_id
      )
    )
  );

-- RLS Policy: Service role can insert/update (for webhooks)
CREATE POLICY "Service role full access" ON org_invites
  FOR ALL USING (auth.role() = 'service_role');

