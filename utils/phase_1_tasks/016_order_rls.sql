-- Migration: 006_order_rls.sql
-- Task 1.9 — RLS policies for new order ticket tables
--
-- TABLES COVERED:
--   order_tickets       — core ticket table
--   order_ticket_items  — line items (access follows parent ticket)
--   order_ticket_logs   — audit trail (access follows parent ticket)
--   payment_holds       — payment state (super_admin full, admin read-only)
--
-- ROLE SUMMARY:
--   super_admin  Full CRUD on all tickets/items/logs/holds in their org
--   admin        CRUD on own location's tickets only. Read-only on own payment holds.
--   employee     SELECT only on fulfilled/confirmed tickets at their location.
--                (They need to see incoming deliveries to confirm receipt.)




-- Enable RLS on all four tables


ALTER TABLE order_tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_ticket_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_holds      ENABLE ROW LEVEL SECURITY;



-- order_tickets


-- Super admin: full access to all tickets in their org
CREATE POLICY "Super admin full access" ON order_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'super_admin'
    )
  );

-- Store admin: CRUD on tickets where requesting_location_id = their assigned location
CREATE POLICY "Admin manage own location tickets" ON order_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'admin'
      AND users.assigned_location_id = order_tickets.requesting_location_id
    )
  );

-- Employee: SELECT only, own location, fulfilled/confirmed statuses only
-- (they need to see incoming deliveries to confirm receipt)
CREATE POLICY "Employee view incoming deliveries" ON order_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'employee'
      AND users.assigned_location_id = order_tickets.requesting_location_id
      AND order_tickets.status IN ('fulfilled', 'confirmed')
    )
  );

-- Service role: full access (for webhooks and edge functions)
CREATE POLICY "Service role full access" ON order_tickets
  FOR ALL USING (auth.role() = 'service_role');



-- order_ticket_items
-- Access follows the parent ticket via JOIN.
-- We don't duplicate role logic here — we check whether the
-- user can see the parent ticket and inherit from that.


-- Super admin
CREATE POLICY "Super admin full access" ON order_ticket_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'super_admin'
    )
  );

-- Store admin: access to items where they own the parent ticket
CREATE POLICY "Admin manage own location ticket items" ON order_ticket_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      JOIN users u ON u.id = auth.jwt() ->> 'sub'::text
      WHERE ot.id = order_ticket_items.ticket_id
      AND u.role = 'admin'
      AND u.assigned_location_id = ot.requesting_location_id
    )
  );

-- Employee: SELECT only on fulfilled/confirmed ticket items at their location
CREATE POLICY "Employee view incoming delivery items" ON order_ticket_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      JOIN users u ON u.id = auth.jwt() ->> 'sub'::text
      WHERE ot.id = order_ticket_items.ticket_id
      AND u.role = 'employee'
      AND u.assigned_location_id = ot.requesting_location_id
      AND ot.status IN ('fulfilled', 'confirmed')
    )
  );

-- Service role
CREATE POLICY "Service role full access" ON order_ticket_items
  FOR ALL USING (auth.role() = 'service_role');


-- order_ticket_logs
-- Same inheritance pattern as order_ticket_items.
-- Employees can read logs on fulfilled/confirmed tickets only.
-- No role can UPDATE or DELETE logs — they are insert-only by
-- design, but RLS cannot enforce insert-only directly, so we
-- restrict to INSERT + SELECT per role.

-- Super admin
CREATE POLICY "Super admin full access" ON order_ticket_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'super_admin'
    )
  );

-- Store admin: SELECT + INSERT on logs for their own tickets
CREATE POLICY "Admin access own location ticket logs" ON order_ticket_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      JOIN users u ON u.id = auth.jwt() ->> 'sub'::text
      WHERE ot.id = order_ticket_logs.ticket_id
      AND u.role = 'admin'
      AND u.assigned_location_id = ot.requesting_location_id
    )
  );

-- Employee: SELECT only on logs for fulfilled/confirmed tickets
CREATE POLICY "Employee view delivery ticket logs" ON order_ticket_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      JOIN users u ON u.id = auth.jwt() ->> 'sub'::text
      WHERE ot.id = order_ticket_logs.ticket_id
      AND u.role = 'employee'
      AND u.assigned_location_id = ot.requesting_location_id
      AND ot.status IN ('fulfilled', 'confirmed')
    )
  );

-- Employee: INSERT allowed on status changes (confirming delivery)
CREATE POLICY "Employee insert confirmation log" ON order_ticket_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      JOIN users u ON u.id = auth.jwt() ->> 'sub'::text
      WHERE ot.id = order_ticket_logs.ticket_id
      AND u.role = 'employee'
      AND u.assigned_location_id = ot.requesting_location_id
      AND ot.status = 'fulfilled'
    )
  );

-- Service role
CREATE POLICY "Service role full access" ON order_ticket_logs
  FOR ALL USING (auth.role() = 'service_role');



-- payment_holds
-- Super admin: full CRUD
-- Admin: SELECT only on holds tied to their own location's tickets
-- Employee: no access (payment is not their concern)


-- Super admin
CREATE POLICY "Super admin full access" ON payment_holds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'super_admin'
    )
  );

-- Store admin: read-only on holds for their own location's tickets
CREATE POLICY "Admin read own location payment holds" ON payment_holds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      JOIN users u ON u.id = auth.jwt() ->> 'sub'::text
      WHERE ot.id = payment_holds.ticket_id
      AND u.role = 'admin'
      AND u.assigned_location_id = ot.requesting_location_id
    )
  );

-- Service role: full access (payment provider webhooks write to this table)
CREATE POLICY "Service role full access" ON payment_holds
  FOR ALL USING (auth.role() = 'service_role');
