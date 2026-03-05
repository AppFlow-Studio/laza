-- ============================================================
-- Fix all policies to use auth.jwt() ->> 'sub' instead of auth.uid()
-- ============================================================

-- organizations
DROP POLICY IF EXISTS "Admins full access" ON organizations;
CREATE POLICY "Admins full access" ON organizations
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
  );

-- locations
DROP POLICY IF EXISTS "Admins full access" ON locations;
CREATE POLICY "Admins full access" ON locations
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
  );

-- storage_spaces
DROP POLICY IF EXISTS "Admins full access" ON storage_spaces;
CREATE POLICY "Admins full access" ON storage_spaces
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
  );

-- items
DROP POLICY IF EXISTS "Admins full access" ON items;
CREATE POLICY "Admins full access" ON items
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
  );

-- item_locations
DROP POLICY IF EXISTS "Admins full access" ON item_locations;
DROP POLICY IF EXISTS "Super admin full access" ON item_locations;
DROP POLICY IF EXISTS "Admin access own location items" ON item_locations;

CREATE POLICY "Super admin full access" ON item_locations
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') = 'super_admin'
  );

CREATE POLICY "Admin access own location items" ON item_locations
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') = 'admin'
    AND location_id = (
      SELECT assigned_location_id FROM public.users
      WHERE id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    get_user_role(auth.jwt() ->> 'sub') = 'admin'
    AND location_id = (
      SELECT assigned_location_id FROM public.users
      WHERE id = auth.jwt() ->> 'sub'
    )
    AND EXISTS (
      SELECT 1 FROM location_catalog lc
      WHERE lc.location_id = item_locations.location_id
        AND lc.item_id = item_locations.item_id
    )
  );

-- inventory_logs
DROP POLICY IF EXISTS "Admins full access" ON inventory_logs;
CREATE POLICY "Admins full access" ON inventory_logs
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
  );

-- alerts
DROP POLICY IF EXISTS "Admins full access" ON alerts;
CREATE POLICY "Admins full access" ON alerts
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
  );

-- update_limits
DROP POLICY IF EXISTS "Admins full access" ON update_limits;
DROP POLICY IF EXISTS "Employees read own location limits" ON update_limits;

CREATE POLICY "Admins full access" ON update_limits
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
  );

CREATE POLICY "Employees read own location limits" ON update_limits
  FOR SELECT USING (
    location_id = (
      SELECT assigned_location_id FROM public.users
      WHERE id = auth.jwt() ->> 'sub'
    )
  );

-- update_override_logs
DROP POLICY IF EXISTS "Admins full access" ON update_override_logs;
CREATE POLICY "Admins full access" ON update_override_logs
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
  );

-- notification_preferences
DROP POLICY IF EXISTS "Admins manage notification preferences" ON notification_preferences;
CREATE POLICY "Admins manage notification preferences" ON notification_preferences
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.jwt() ->> 'sub'
      AND members.organization_id::text = notification_preferences.organization_id::text
    )
  );

-- low_stock_thresholds
DROP POLICY IF EXISTS "Admins manage low stock thresholds" ON low_stock_thresholds;
CREATE POLICY "Admins manage low stock thresholds" ON low_stock_thresholds
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.jwt() ->> 'sub'
      AND members.organization_id::text = low_stock_thresholds.organization_id::text
    )
  );

-- daily_summary_preferences
DROP POLICY IF EXISTS "Admins manage daily summary preferences" ON daily_summary_preferences;
CREATE POLICY "Admins manage daily summary preferences" ON daily_summary_preferences
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.jwt() ->> 'sub'
      AND members.organization_id::text = daily_summary_preferences.organization_id::text
    )
  );

-- email_delivery_logs
DROP POLICY IF EXISTS "Admins view email delivery logs" ON email_delivery_logs;
CREATE POLICY "Admins view email delivery logs" ON email_delivery_logs
  FOR SELECT USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.jwt() ->> 'sub'
      AND members.organization_id::text = email_delivery_logs.organization_id::text
    )
  );

-- low_stock_notification_queue
DROP POLICY IF EXISTS "Admins view notification queue" ON low_stock_notification_queue;
CREATE POLICY "Admins view notification queue" ON low_stock_notification_queue
  FOR SELECT USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.jwt() ->> 'sub'
      AND members.organization_id::text = low_stock_notification_queue.organization_id::text
    )
  );

-- email_schedule_log
DROP POLICY IF EXISTS "Admins view email schedule logs" ON email_schedule_log;
CREATE POLICY "Admins view email schedule logs" ON email_schedule_log
  FOR SELECT USING (
    get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin')
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.jwt() ->> 'sub'
      AND members.organization_id::text = email_schedule_log.organization_id::text
    )
  );

-- order_tickets
DROP POLICY IF EXISTS "Super admin full access" ON order_tickets;
DROP POLICY IF EXISTS "Admin manage own location tickets" ON order_tickets;
DROP POLICY IF EXISTS "Employee view incoming deliveries" ON order_tickets;

CREATE POLICY "Super admin full access" ON order_tickets
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') = 'super_admin'
  );

CREATE POLICY "Admin manage own location tickets" ON order_tickets
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') = 'admin'
    AND requesting_location_id = (
      SELECT assigned_location_id FROM public.users
      WHERE id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Employee view incoming deliveries" ON order_tickets
  FOR SELECT USING (
    get_user_role(auth.jwt() ->> 'sub') = 'employee'
    AND requesting_location_id = (
      SELECT assigned_location_id FROM public.users
      WHERE id = auth.jwt() ->> 'sub'
    )
    AND status IN ('fulfilled', 'confirmed')
  );

-- order_ticket_items
DROP POLICY IF EXISTS "Super admin full access" ON order_ticket_items;
DROP POLICY IF EXISTS "Admin manage own location ticket items" ON order_ticket_items;
DROP POLICY IF EXISTS "Employee view incoming delivery items" ON order_ticket_items;

CREATE POLICY "Super admin full access" ON order_ticket_items
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') = 'super_admin'
  );

CREATE POLICY "Admin manage own location ticket items" ON order_ticket_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      WHERE ot.id = order_ticket_items.ticket_id
      AND ot.requesting_location_id = (
        SELECT assigned_location_id FROM public.users
        WHERE id = auth.jwt() ->> 'sub'
      )
      AND get_user_role(auth.jwt() ->> 'sub') = 'admin'
    )
  );

CREATE POLICY "Employee view incoming delivery items" ON order_ticket_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      WHERE ot.id = order_ticket_items.ticket_id
      AND ot.requesting_location_id = (
        SELECT assigned_location_id FROM public.users
        WHERE id = auth.jwt() ->> 'sub'
      )
      AND ot.status IN ('fulfilled', 'confirmed')
      AND get_user_role(auth.jwt() ->> 'sub') = 'employee'
    )
  );

-- order_ticket_logs
DROP POLICY IF EXISTS "Super admin full access" ON order_ticket_logs;
DROP POLICY IF EXISTS "Admin access own location ticket logs" ON order_ticket_logs;
DROP POLICY IF EXISTS "Employee view delivery ticket logs" ON order_ticket_logs;
DROP POLICY IF EXISTS "Employee insert confirmation log" ON order_ticket_logs;

CREATE POLICY "Super admin full access" ON order_ticket_logs
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') = 'super_admin'
  );

CREATE POLICY "Admin access own location ticket logs" ON order_ticket_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      WHERE ot.id = order_ticket_logs.ticket_id
      AND ot.requesting_location_id = (
        SELECT assigned_location_id FROM public.users
        WHERE id = auth.jwt() ->> 'sub'
      )
      AND get_user_role(auth.jwt() ->> 'sub') = 'admin'
    )
  );

CREATE POLICY "Employee view delivery ticket logs" ON order_ticket_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      WHERE ot.id = order_ticket_logs.ticket_id
      AND ot.requesting_location_id = (
        SELECT assigned_location_id FROM public.users
        WHERE id = auth.jwt() ->> 'sub'
      )
      AND ot.status IN ('fulfilled', 'confirmed')
      AND get_user_role(auth.jwt() ->> 'sub') = 'employee'
    )
  );

CREATE POLICY "Employee insert confirmation log" ON order_ticket_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      WHERE ot.id = order_ticket_logs.ticket_id
      AND ot.requesting_location_id = (
        SELECT assigned_location_id FROM public.users
        WHERE id = auth.jwt() ->> 'sub'
      )
      AND ot.status = 'fulfilled'
      AND get_user_role(auth.jwt() ->> 'sub') = 'employee'
    )
  );

-- payment_holds
DROP POLICY IF EXISTS "Super admin full access" ON payment_holds;
DROP POLICY IF EXISTS "Admin read own location payment holds" ON payment_holds;

CREATE POLICY "Super admin full access" ON payment_holds
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub') = 'super_admin'
  );

CREATE POLICY "Admin read own location payment holds" ON payment_holds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_tickets ot
      WHERE ot.id = payment_holds.ticket_id
      AND ot.requesting_location_id = (
        SELECT assigned_location_id FROM public.users
        WHERE id = auth.jwt() ->> 'sub'
      )
      AND get_user_role(auth.jwt() ->> 'sub') = 'admin'
    )
  );