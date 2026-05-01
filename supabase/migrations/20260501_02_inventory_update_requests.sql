BEGIN;

CREATE TABLE public.inventory_update_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            TEXT        NOT NULL REFERENCES public.organizations(id),
  location_id       UUID        NOT NULL REFERENCES public.locations(id),
  storage_space_id  UUID        REFERENCES public.storage_spaces(id),
  item_id           BIGINT      NOT NULL REFERENCES public.items(id),
  requested_by      TEXT        NOT NULL REFERENCES public.users(id),
  action_type       TEXT        NOT NULL CHECK (action_type IN ('count','adjustment','used')),
  new_quantity      NUMERIC     NOT NULL CHECK (new_quantity >= 0),
  previous_quantity NUMERIC     NOT NULL DEFAULT 0,
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by       TEXT        REFERENCES public.users(id),
  reviewed_at       TIMESTAMPTZ,
  review_note       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one pending request per item+location+storage_space at a time.
CREATE INDEX idx_iur_pending ON public.inventory_update_requests (item_id, location_id, storage_space_id, status)
  WHERE status = 'pending';

-- ─── Function: approve_inventory_update_request ───────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_inventory_update_request(
  p_request_id  UUID,
  p_reviewed_by TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req      RECORD;
  v_prev_qty double precision;
BEGIN
  SELECT * INTO v_req
  FROM public.inventory_update_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or not pending', p_request_id;
  END IF;

  -- Mark approved
  UPDATE public.inventory_update_requests
  SET status      = 'approved',
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW()
  WHERE id = p_request_id;

  -- Get current quantity
  SELECT COALESCE(current_quantity, 0) INTO v_prev_qty
  FROM public.item_locations
  WHERE item_id        = v_req.item_id
    AND location_id    = v_req.location_id
    AND storage_space_id IS NOT DISTINCT FROM v_req.storage_space_id;

  IF NOT FOUND THEN v_prev_qty := 0; END IF;

  -- Apply quantity change
  UPDATE public.item_locations
  SET current_quantity = v_req.new_quantity,
      last_updated     = NOW()
  WHERE item_id        = v_req.item_id
    AND location_id    = v_req.location_id
    AND storage_space_id IS NOT DISTINCT FROM v_req.storage_space_id;

  IF NOT FOUND THEN
    INSERT INTO public.item_locations
      (item_id, location_id, storage_space_id, current_quantity, organization_id, last_updated)
    VALUES
      (v_req.item_id, v_req.location_id, v_req.storage_space_id,
       v_req.new_quantity, v_req.org_id, NOW());
  END IF;

  -- Audit log
  INSERT INTO public.inventory_logs
    (item_id, location_id, storage_space_id, action_type,
     previous_quantity, new_quantity, quantity_change,
     user_id, notes, organization_id)
  VALUES
    (v_req.item_id, v_req.location_id, v_req.storage_space_id, v_req.action_type,
     v_prev_qty, v_req.new_quantity, v_req.new_quantity - v_prev_qty,
     v_req.requested_by, 'Approved request ' || v_req.id::text, v_req.org_id);
END;
$$;

-- ─── Function: reject_inventory_update_request ────────────────────────────────

CREATE OR REPLACE FUNCTION public.reject_inventory_update_request(
  p_request_id  UUID,
  p_reviewed_by TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory_update_requests
  SET status      = 'rejected',
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW(),
      review_note = p_review_note
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or not pending', p_request_id;
  END IF;
END;
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.inventory_update_requests ENABLE ROW LEVEL SECURITY;

-- Admins see all requests for their org
CREATE POLICY "Admin read org requests" ON public.inventory_update_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_my_claim('sub')
        AND u.organization_id = inventory_update_requests.org_id
        AND u.role = 'admin'
    )
  );

-- Employees can insert requests for their location
CREATE POLICY "Employee insert requests" ON public.inventory_update_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_my_claim('sub')
        AND u.organization_id = inventory_update_requests.org_id
    )
    AND requested_by = get_my_claim('sub')
  );

-- Employees can read their own requests
CREATE POLICY "Employee read own requests" ON public.inventory_update_requests
  FOR SELECT TO authenticated
  USING (requested_by = get_my_claim('sub'));

COMMIT;
