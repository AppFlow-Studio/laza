-- Restores prod objects overwritten by 20261031190000_prod_catchup (functions, policies, constraints).
BEGIN;
ALTER TABLE public."email_delivery_logs" DROP CONSTRAINT IF EXISTS "email_delivery_logs_email_type_check";
ALTER TABLE public."email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_email_type_check" CHECK ((email_type = ANY (ARRAY['low_stock_alert'::text, 'low_stock_digest'::text, 'daily_summary'::text])));
ALTER TABLE public."order_tickets" DROP CONSTRAINT IF EXISTS "order_tickets_status_check";
ALTER TABLE public."order_tickets" ADD CONSTRAINT "order_tickets_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'processing'::text, 'fulfilled'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text])));
CREATE OR REPLACE FUNCTION public.get_user_role(user_id text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  RETURN user_role;
END;
$function$;
CREATE OR REPLACE FUNCTION public.is_admin_or_above()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN get_user_role(auth.uid()::text) IN ('admin', 'super_admin');
END;
$function$;
CREATE OR REPLACE FUNCTION public.check_low_stock_with_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$DECLARE
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
END;$function$;
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$BEGIN
  RETURN get_user_role(auth.jwt() ->> 'sub') = 'super_admin';
END;$function$;
CREATE OR REPLACE FUNCTION public.requesting_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
    SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::text;
$function$;
DROP POLICY IF EXISTS "Admin access own location items" ON public."item_locations";
CREATE POLICY "Admin access own location items" ON public."item_locations" AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  WITH CHECK (((auth.jwt() ->> 'user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])));
DROP POLICY IF EXISTS "Admins and employees can select item_locations in their organiz" ON public."item_locations";
CREATE POLICY "Admins and employees can select item_locations in their organiz" ON public."item_locations" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = item_locations.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = ANY (ARRAY['admin'::text, 'employee'::text]))))));
DROP POLICY IF EXISTS "Admins and employees can update item_locations in their organiz" ON public."item_locations";
CREATE POLICY "Admins and employees can update item_locations in their organiz" ON public."item_locations" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = item_locations.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = ANY (ARRAY['admin'::text, 'employee'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = item_locations.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = ANY (ARRAY['admin'::text, 'employee'::text]))))));
DROP POLICY IF EXISTS "Admins can delete item_locations in their organization" ON public."item_locations";
CREATE POLICY "Admins can delete item_locations in their organization" ON public."item_locations" AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = item_locations.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Super admin full access" ON public."item_locations";
CREATE POLICY "Super admin full access" ON public."item_locations" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "Admins can delete storage_spaces in their organization" ON public."storage_spaces";
CREATE POLICY "Admins can delete storage_spaces in their organization" ON public."storage_spaces" AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = storage_spaces.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admins can update storage_spaces in their organization" ON public."storage_spaces";
CREATE POLICY "Admins can update storage_spaces in their organization" ON public."storage_spaces" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = storage_spaces.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = storage_spaces.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admins can delete locations in their organization" ON public."locations";
CREATE POLICY "Admins can delete locations in their organization" ON public."locations" AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = locations.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admins can update locations in their organization" ON public."locations";
CREATE POLICY "Admins can update locations in their organization" ON public."locations" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = locations.organization_id) AND (u.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = locations.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admin manage own location tickets" ON public."order_tickets";
CREATE POLICY "Admin manage own location tickets" ON public."order_tickets" AS PERMISSIVE FOR ALL TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (requesting_location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text))))));
DROP POLICY IF EXISTS "Super admin full access" ON public."order_tickets";
CREATE POLICY "Super admin full access" ON public."order_tickets" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "Admin access own location ticket logs" ON public."order_ticket_logs";
CREATE POLICY "Admin access own location ticket logs" ON public."order_ticket_logs" AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM order_tickets ot
  WHERE ((ot.id = order_ticket_logs.ticket_id) AND (ot.requesting_location_id = ( SELECT users.assigned_location_id
           FROM users
          WHERE (users.id = (auth.jwt() ->> 'sub'::text)))) AND (get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text)))));
DROP POLICY IF EXISTS "Employee insert confirmation log" ON public."order_ticket_logs";
CREATE POLICY "Employee insert confirmation log" ON public."order_ticket_logs" AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM order_tickets ot
  WHERE ((ot.id = order_ticket_logs.ticket_id) AND (ot.requesting_location_id = ( SELECT users.assigned_location_id
           FROM users
          WHERE (users.id = (auth.jwt() ->> 'sub'::text)))) AND (ot.status = 'fulfilled'::text) AND (get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text)))));
DROP POLICY IF EXISTS "Employee view delivery ticket logs" ON public."order_ticket_logs";
CREATE POLICY "Employee view delivery ticket logs" ON public."order_ticket_logs" AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM order_tickets ot
  WHERE ((ot.id = order_ticket_logs.ticket_id) AND (ot.requesting_location_id = ( SELECT users.assigned_location_id
           FROM users
          WHERE (users.id = (auth.jwt() ->> 'sub'::text)))) AND (ot.status = ANY (ARRAY['fulfilled'::text, 'confirmed'::text])) AND (get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text)))));
DROP POLICY IF EXISTS "Super admin full access" ON public."order_ticket_logs";
CREATE POLICY "Super admin full access" ON public."order_ticket_logs" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "admin_read_location_catalog" ON public."location_catalog";
CREATE POLICY "admin_read_location_catalog" ON public."location_catalog" AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.role = 'admin'::text) AND (users.assigned_location_id = location_catalog.location_id)))));
DROP POLICY IF EXISTS "employee_read_location_catalog" ON public."location_catalog";
CREATE POLICY "employee_read_location_catalog" ON public."location_catalog" AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.uid())::text) AND (users.role = 'employee'::text) AND (users.assigned_location_id = location_catalog.location_id)))));
DROP POLICY IF EXISTS "Admin manage own location ticket items" ON public."order_ticket_items";
CREATE POLICY "Admin manage own location ticket items" ON public."order_ticket_items" AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM order_tickets ot
  WHERE ((ot.id = order_ticket_items.ticket_id) AND (ot.requesting_location_id = ( SELECT users.assigned_location_id
           FROM users
          WHERE (users.id = (auth.jwt() ->> 'sub'::text)))) AND (get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text)))));
DROP POLICY IF EXISTS "Employee view incoming delivery items" ON public."order_ticket_items";
CREATE POLICY "Employee view incoming delivery items" ON public."order_ticket_items" AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM order_tickets ot
  WHERE ((ot.id = order_ticket_items.ticket_id) AND (ot.requesting_location_id = ( SELECT users.assigned_location_id
           FROM users
          WHERE (users.id = (auth.jwt() ->> 'sub'::text)))) AND (ot.status = ANY (ARRAY['fulfilled'::text, 'confirmed'::text])) AND (get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text)))));
DROP POLICY IF EXISTS "Super admin full access" ON public."order_ticket_items";
CREATE POLICY "Super admin full access" ON public."order_ticket_items" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
COMMIT;
