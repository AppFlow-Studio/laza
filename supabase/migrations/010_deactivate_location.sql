-- Migration: 010_deactivate_location.sql
-- Task 1.25 — Location deactivation cascade logic

CREATE OR REPLACE FUNCTION deactivate_location(
  p_location_id UUID,
  p_admin_user_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_location_name TEXT;
  v_organization_id TEXT;
  v_affected_users INT;
  v_cancelled_tickets INT;
  v_resolved_alerts INT;
BEGIN
  -- Guard: caller must be super_admin
  IF get_user_role(auth.jwt() ->> 'sub') != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can deactivate locations';
  END IF;

  -- Get location info for logging
  SELECT name, organization_id 
  INTO v_location_name, v_organization_id
  FROM locations 
  WHERE id = p_location_id;

  IF v_location_name IS NULL THEN
    RAISE EXCEPTION 'Location not found: %', p_location_id;
  END IF;

  -- Step 1: Deactivate the location
  UPDATE locations
  SET is_active = false,
      updated_at = NOW()
  WHERE id = p_location_id;

  -- Step 2: Deactivate and unassign all employees at this location
  UPDATE users
  SET is_active = false,
      assigned_location_id = NULL,
      updated_at = NOW()
  WHERE assigned_location_id = p_location_id
  AND is_active = true;

  GET DIAGNOSTICS v_affected_users = ROW_COUNT;

  -- Step 3: Cancel all pending/draft tickets for this location (both sides)
  -- Requesting side (store placed the order)
  WITH cancelled AS (
    UPDATE order_tickets
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE (requesting_location_id = p_location_id
      OR warehouse_location_id = p_location_id)
    AND status IN ('draft', 'submitted')
    RETURNING id
  )
  INSERT INTO order_ticket_logs (
    ticket_id,
    previous_status,
    new_status,
    changed_by,
    notes,
    created_at
  )
  SELECT 
    id,
    'submitted',
    'cancelled',
    p_admin_user_id,
    'Auto-cancelled due to location deactivation',
    NOW()
  FROM cancelled;

  GET DIAGNOSTICS v_cancelled_tickets = ROW_COUNT;

  -- Step 4: Resolve all active alerts for this location
  UPDATE alerts
  SET resolved_at = NOW()
  WHERE location_id = p_location_id
  AND resolved_at IS NULL;

  GET DIAGNOSTICS v_resolved_alerts = ROW_COUNT;

  -- Step 5: Log the deactivation in permission_change_logs
  INSERT INTO permission_change_logs (
    id,
    organization_id,
    actor_user_id,
    action_type,
    previous_value,
    new_value,
    previous_location_id,
    notes,
    source,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_organization_id,
    p_admin_user_id,
    'location_deactivated',
    'active',
    'inactive',
    p_location_id,
    format(
      'Location "%s" deactivated. %s employees unassigned, %s tickets cancelled, %s alerts resolved.',
      v_location_name,
      v_affected_users,
      v_cancelled_tickets,
      v_resolved_alerts
    ),
    'super_admin_action',
    NOW()
  );

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'location_id', p_location_id,
    'location_name', v_location_name,
    'affected_users', v_affected_users,
    'cancelled_tickets', v_cancelled_tickets,
    'resolved_alerts', v_resolved_alerts
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to deactivate location: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Companion: reactivate_location()
-- Only reactivates the location itself — employees and tickets stay as-is
CREATE OR REPLACE FUNCTION reactivate_location(
  p_location_id UUID,
  p_admin_user_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_location_name TEXT;
  v_organization_id TEXT;
BEGIN
  -- Guard: caller must be super_admin
  IF get_user_role(auth.jwt() ->> 'sub') != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can reactivate locations';
  END IF;

  -- Get location info
  SELECT name, organization_id
  INTO v_location_name, v_organization_id
  FROM locations
  WHERE id = p_location_id;

  IF v_location_name IS NULL THEN
    RAISE EXCEPTION 'Location not found: %', p_location_id;
  END IF;

  -- Reactivate the location only
  UPDATE locations
  SET is_active = true,
      updated_at = NOW()
  WHERE id = p_location_id;

  -- Log the reactivation
  INSERT INTO permission_change_logs (
    id,
    organization_id,
    actor_user_id,
    action_type,
    previous_value,
    new_value,
    previous_location_id,
    notes,
    source,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_organization_id,
    p_admin_user_id,
    'location_reactivated',
    'inactive',
    'active',
    p_location_id,
    format('Location "%s" reactivated by super_admin.', v_location_name),
    'super_admin_action',
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'location_id', p_location_id,
    'location_name', v_location_name
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to reactivate location: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;