# Store Direct Purchases & Inventory Update Approval — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add store-level direct purchase recording (auto-updates inventory) and an employee quantity update approval workflow where changes require admin sign-off before taking effect.

**Architecture:** Two new Postgres tables (`store_purchases`/`store_purchase_items` and `inventory_update_requests`) with RPC functions for atomic operations. New `/admin/purchases` pages mirror the existing orders UI. The employee `QuantityUpdateModal` is updated to route through the approval queue instead of calling `updateQuantity()` directly. Admin inventory page gets a "Pending Requests" panel.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RPC), TanStack React Query, Clerk auth, shadcn/ui, Tailwind, react-hook-form + zod, lucide-react.

**Note on verification:** This codebase has no test runner configured. Each task uses `npx tsc --noEmit` as the type-check step in place of unit tests. After completing all tasks, verify manually using the dev server.

---

## File Map

**Create:**
- `supabase/migrations/20260501_01_store_purchases.sql` — tables + `create_store_purchase()` RPC
- `supabase/migrations/20260501_02_inventory_update_requests.sql` — table + `approve_inventory_update_request()` / `reject_inventory_update_request()` PG functions
- `lib/supabase/queries/storePurchases.ts` — `getStorePurchases`, `getStorePurchaseById`, `createStorePurchase`
- `lib/supabase/queries/inventoryUpdateRequests.ts` — `getInventoryUpdateRequests`, `createInventoryUpdateRequest`, `approveInventoryUpdateRequest`, `rejectInventoryUpdateRequest`
- `lib/hooks/queries/useStorePurchases.ts` — React Query hooks
- `lib/hooks/queries/useInventoryUpdateRequests.ts` — React Query hooks
- `app/(dashboard)/admin/purchases/page.tsx` — list page
- `app/(dashboard)/admin/purchases/new/page.tsx` — new purchase form page
- `app/(dashboard)/admin/purchases/[id]/page.tsx` — detail page
- `components/admin/purchases/NewPurchaseForm.tsx` — form component
- `components/admin/purchases/PurchaseDetail.tsx` — detail component
- `components/admin/inventory/PendingRequestsPanel.tsx` — pending requests panel

**Modify:**
- `lib/supabase/types.ts` — add `store_purchases`, `store_purchase_items`, `inventory_update_requests` table types
- `app/(dashboard)/admin/layout.tsx` — add Purchases to `navigation` array (line 52)
- `components/admin/inventory/QuantityUpdateModal.tsx` — route employee updates through approval flow
- `app/(dashboard)/admin/inventory/page.tsx` — add `PendingRequestsPanel`

---

## Task 1: DB Migration — store_purchases tables + RPC

**Files:**
- Create: `supabase/migrations/20260501_01_store_purchases.sql`

- [ ] **Step 1: Create the migration file**

```sql
BEGIN;

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE public.store_purchases (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT        NOT NULL REFERENCES public.organizations(id),
  location_id    UUID        NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  purchased_by   TEXT        NOT NULL REFERENCES public.users(id),
  purchased_at   TIMESTAMPTZ NOT NULL,
  supplier_name  TEXT,
  notes          TEXT,
  total_cost     NUMERIC     NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.store_purchase_items (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id  UUID    NOT NULL REFERENCES public.store_purchases(id) ON DELETE CASCADE,
  item_id      BIGINT  NOT NULL REFERENCES public.items(id),
  quantity     NUMERIC NOT NULL CHECK (quantity > 0),
  unit_cost    NUMERIC NOT NULL CHECK (unit_cost >= 0),
  line_total   NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- ─── RPC: create_store_purchase ───────────────────────────────────────────────
-- Atomically inserts the purchase header, line items, increments item_locations,
-- and writes inventory_logs entries. Returns the new purchase UUID.

CREATE OR REPLACE FUNCTION public.create_store_purchase(
  p_org_id        TEXT,
  p_location_id   UUID,
  p_purchased_by  TEXT,
  p_purchased_at  TIMESTAMPTZ,
  p_supplier_name TEXT,
  p_notes         TEXT,
  p_items         JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id UUID;
  v_item        JSONB;
  v_item_id     BIGINT;
  v_qty         NUMERIC;
  v_unit_cost   NUMERIC;
  v_total_cost  NUMERIC := 0;
  v_prev_qty    NUMERIC;
  v_new_qty     NUMERIC;
BEGIN
  -- Sum total cost from items array
  SELECT COALESCE(SUM((e->>'quantity')::numeric * (e->>'unit_cost')::numeric), 0)
  INTO v_total_cost
  FROM jsonb_array_elements(p_items) e;

  -- Insert purchase header
  INSERT INTO public.store_purchases
    (org_id, location_id, purchased_by, purchased_at, supplier_name, notes, total_cost)
  VALUES
    (p_org_id, p_location_id, p_purchased_by, p_purchased_at, p_supplier_name, p_notes, v_total_cost)
  RETURNING id INTO v_purchase_id;

  -- Process each line item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_id   := (v_item->>'item_id')::bigint;
    v_qty       := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;

    -- Insert line item (line_total is generated)
    INSERT INTO public.store_purchase_items (purchase_id, item_id, quantity, unit_cost)
    VALUES (v_purchase_id, v_item_id, v_qty, v_unit_cost);

    -- Read current quantity (NULL storage_space_id = location-level unassigned stock)
    SELECT COALESCE(current_quantity, 0)
    INTO v_prev_qty
    FROM public.item_locations
    WHERE item_id    = v_item_id
      AND location_id = p_location_id::text
      AND storage_space_id IS NULL;

    IF NOT FOUND THEN v_prev_qty := 0; END IF;
    v_new_qty := v_prev_qty + v_qty;

    -- Upsert item_locations (UPDATE first to avoid NULL unique-constraint edge cases)
    UPDATE public.item_locations
    SET current_quantity = v_new_qty,
        last_updated     = NOW()
    WHERE item_id        = v_item_id
      AND location_id    = p_location_id::text
      AND storage_space_id IS NULL;

    IF NOT FOUND THEN
      INSERT INTO public.item_locations
        (item_id, location_id, storage_space_id, current_quantity, organization_id, last_updated)
      VALUES
        (v_item_id, p_location_id::text, NULL, v_new_qty, p_org_id, NOW());
    END IF;

    -- Audit log
    INSERT INTO public.inventory_logs
      (item_id, location_id, storage_space_id, action_type,
       previous_quantity, new_quantity, quantity_change,
       user_id, notes, organization_id)
    VALUES
      (v_item_id, p_location_id::text, NULL, 'received',
       v_prev_qty, v_new_qty, v_qty,
       p_purchased_by, 'Store purchase ' || v_purchase_id::text, p_org_id);
  END LOOP;

  RETURN v_purchase_id;
END;
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.store_purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_purchase_items ENABLE ROW LEVEL SECURITY;

-- Admins of the org can read/insert purchases for their org
CREATE POLICY "Admin read own org purchases" ON public.store_purchases
  FOR SELECT TO authenticated
  USING (
    org_id = (SELECT organization_id FROM public.users WHERE id = get_my_claim('sub'))
    AND (SELECT role FROM public.users WHERE id = get_my_claim('sub')) = 'admin'
  );

CREATE POLICY "Admin insert own org purchases" ON public.store_purchases
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT organization_id FROM public.users WHERE id = get_my_claim('sub'))
    AND (SELECT role FROM public.users WHERE id = get_my_claim('sub')) = 'admin'
  );

CREATE POLICY "Admin read own org purchase items" ON public.store_purchase_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_purchases sp
      JOIN public.users u ON u.id = get_my_claim('sub')
      WHERE sp.id = store_purchase_items.purchase_id
        AND sp.org_id = u.organization_id
        AND u.role = 'admin'
    )
  );

CREATE POLICY "Admin insert own org purchase items" ON public.store_purchase_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_purchases sp
      JOIN public.users u ON u.id = get_my_claim('sub')
      WHERE sp.id = store_purchase_items.purchase_id
        AND sp.org_id = u.organization_id
        AND u.role = 'admin'
    )
  );

COMMIT;
```

- [ ] **Step 2: Apply the migration to your local Supabase**

```bash
npx supabase db push
```

Expected: no errors. If you see a type mismatch on `location_id` cast, check whether `locations.id` is UUID or TEXT in the baseline migration and adjust `p_location_id::text` accordingly — if `locations.id` is UUID, remove the `::text` casts inside the function.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260501_01_store_purchases.sql
git commit -m "feat: add store_purchases tables and create_store_purchase RPC"
```

---

## Task 2: DB Migration — inventory_update_requests table + PG functions

**Files:**
- Create: `supabase/migrations/20260501_02_inventory_update_requests.sql`

- [ ] **Step 1: Create the migration file**

```sql
BEGIN;

CREATE TABLE public.inventory_update_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            TEXT        NOT NULL REFERENCES public.organizations(id),
  location_id       TEXT        NOT NULL REFERENCES public.locations(id),
  storage_space_id  TEXT        REFERENCES public.storage_spaces(id),
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
-- When a new request is submitted for the same slot, the old pending one is replaced
-- (handled in the approve/reject functions and in the server action).
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
  v_prev_qty NUMERIC;
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
    org_id = (SELECT organization_id FROM public.users WHERE id = get_my_claim('sub'))
    AND (SELECT role FROM public.users WHERE id = get_my_claim('sub')) = 'admin'
  );

-- Employees can insert requests for their location
CREATE POLICY "Employee insert requests" ON public.inventory_update_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT organization_id FROM public.users WHERE id = get_my_claim('sub'))
    AND requested_by = get_my_claim('sub')
  );

-- Employees can read their own requests
CREATE POLICY "Employee read own requests" ON public.inventory_update_requests
  FOR SELECT TO authenticated
  USING (requested_by = get_my_claim('sub'));

COMMIT;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260501_02_inventory_update_requests.sql
git commit -m "feat: add inventory_update_requests table and approve/reject PG functions"
```

---

## Task 3: TypeScript types for new tables

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Find the insertion point**

Open `lib/supabase/types.ts`. Find the `Tables` object (starts around line 50). The tables are in alphabetical order. Add `inventory_update_requests` after `inventory_logs` and `store_purchases` / `store_purchase_items` after `storage_spaces`.

- [ ] **Step 2: Add inventory_update_requests type block**

Insert after the closing `}` of the `inventory_logs` block:

```typescript
      inventory_update_requests: {
        Row: {
          action_type: string
          created_at: string
          id: string
          item_id: number
          location_id: string
          new_quantity: number
          notes: string | null
          org_id: string
          previous_quantity: number
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_space_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          item_id: number
          location_id: string
          new_quantity: number
          notes?: string | null
          org_id: string
          previous_quantity?: number
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_space_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          item_id?: number
          location_id?: string
          new_quantity?: number
          notes?: string | null
          org_id?: string
          previous_quantity?: number
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_update_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_update_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_update_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_update_requests_storage_space_id_fkey"
            columns: ["storage_space_id"]
            isOneToOne: false
            referencedRelation: "storage_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 3: Add store_purchases and store_purchase_items type blocks**

Insert after the closing `}` of the `storage_spaces` block (alphabetical order):

```typescript
      store_purchase_items: {
        Row: {
          id: string
          item_id: number
          line_total: number
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          id?: string
          item_id: number
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          id?: string
          item_id?: number
          purchase_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "store_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      store_purchases: {
        Row: {
          created_at: string
          id: string
          location_id: string
          notes: string | null
          org_id: string
          purchased_at: string
          purchased_by: string
          supplier_name: string | null
          total_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          org_id: string
          purchased_at: string
          purchased_by: string
          supplier_name?: string | null
          total_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          purchased_at?: string
          purchased_by?: string
          supplier_name?: string | null
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_purchases_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new table types.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add TypeScript types for store_purchases and inventory_update_requests"
```

---

## Task 4: Store purchases — query + mutation functions

**Files:**
- Create: `lib/supabase/queries/storePurchases.ts`

- [ ] **Step 1: Create the file**

```typescript
"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface StorePurchaseItem {
  itemId: number;
  quantity: number;
  unitCost: number;
}

export interface CreateStorePurchaseInput {
  orgId: string;
  locationId: string;
  purchasedBy: string;
  purchasedAt: string; // ISO string
  supplierName?: string | null;
  notes?: string | null;
  items: StorePurchaseItem[];
}

export async function createStorePurchase(input: CreateStorePurchaseInput): Promise<string> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_store_purchase", {
    p_org_id:        input.orgId,
    p_location_id:   input.locationId,
    p_purchased_by:  input.purchasedBy,
    p_purchased_at:  input.purchasedAt,
    p_supplier_name: input.supplierName ?? null,
    p_notes:         input.notes ?? null,
    p_items: input.items.map((i) => ({
      item_id:   i.itemId,
      quantity:  i.quantity,
      unit_cost: i.unitCost,
    })),
  });
  if (error) throw error;
  return data as string;
}

export async function getStorePurchases(orgId: string, locationId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("store_purchases")
    .select(`
      id,
      purchased_at,
      supplier_name,
      notes,
      total_cost,
      purchased_by,
      created_at,
      store_purchase_items (
        id,
        item_id,
        quantity,
        unit_cost,
        line_total,
        items ( id, name, unit_of_measure )
      )
    `)
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getStorePurchaseById(id: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("store_purchases")
    .select(`
      id,
      purchased_at,
      supplier_name,
      notes,
      total_cost,
      purchased_by,
      created_at,
      location_id,
      org_id,
      store_purchase_items (
        id,
        item_id,
        quantity,
        unit_cost,
        line_total,
        items ( id, name, unit_of_measure, sku )
      )
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/queries/storePurchases.ts
git commit -m "feat: add store purchases query and mutation functions"
```

---

## Task 5: Store purchases — React Query hooks

**Files:**
- Create: `lib/hooks/queries/useStorePurchases.ts`

- [ ] **Step 1: Create the file**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@clerk/nextjs";
import { useAdminStore } from "@/lib/stores/adminStore";
import {
  getStorePurchases,
  getStorePurchaseById,
  createStorePurchase,
  type CreateStorePurchaseInput,
} from "@/lib/supabase/queries/storePurchases";

export const storePurchaseKeys = {
  all:    ["store-purchases"] as const,
  lists:  () => [...storePurchaseKeys.all, "list"] as const,
  byLocation: (orgId: string, locationId: string) =>
    [...storePurchaseKeys.lists(), orgId, locationId] as const,
  detail: (id: string) => [...storePurchaseKeys.all, "detail", id] as const,
};

export function useStorePurchases() {
  const { organization } = useOrganization();
  const { selectedLocationId } = useAdminStore();
  const orgId = organization?.id;

  return useQuery({
    queryKey: storePurchaseKeys.byLocation(orgId ?? "", selectedLocationId ?? ""),
    queryFn:  () => getStorePurchases(orgId!, selectedLocationId!),
    enabled:  !!orgId && !!selectedLocationId,
    staleTime: 30_000,
  });
}

export function useStorePurchase(id: string | undefined) {
  return useQuery({
    queryKey: storePurchaseKeys.detail(id ?? ""),
    queryFn:  () => getStorePurchaseById(id!),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

export function useCreateStorePurchase() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: (input: CreateStorePurchaseInput) => createStorePurchase(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storePurchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/queries/useStorePurchases.ts
git commit -m "feat: add React Query hooks for store purchases"
```

---

## Task 6: Add Purchases to admin sidebar navigation

**Files:**
- Modify: `app/(dashboard)/admin/layout.tsx`

- [ ] **Step 1: Add ShoppingBag import to the lucide-react import block (line 5)**

In `app/(dashboard)/admin/layout.tsx`, find the lucide-react import block and add `ShoppingBag`:

```typescript
import {
    LayoutDashboard,
    Users,
    Package,
    BarChart3,
    LogOut,
    Home,
    Tags,
    Settings,
    StretchHorizontal,
    Warehouse,
    Thermometer,
    ShoppingBag,
} from "lucide-react";
```

- [ ] **Step 2: Add Purchases entry to the navigation array (line 54)**

In `app/(dashboard)/admin/layout.tsx`, find the `navigation` array and add a Purchases entry after Orders:

```typescript
const navigation = [
    { name: "Dashboard",  href: "/admin",           icon: LayoutDashboard },
    { name: "Orders",     href: "/admin/orders",     icon: StretchHorizontal },
    { name: "Purchases",  href: "/admin/purchases",  icon: ShoppingBag },
    { name: "Users",      href: "/admin/users",      icon: Users },
    { name: "Items",      href: "/admin/items",      icon: Package },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Inventory",  href: "/admin/inventory",  icon: BarChart3 },
    { name: "Settings",   href: "/admin/settings/notifications", icon: Settings },
];
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/admin/layout.tsx
git commit -m "feat: add Purchases link to admin sidebar navigation"
```

---

## Task 7: Purchases list page

**Files:**
- Create: `app/(dashboard)/admin/purchases/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag, Plus, CalendarDays, TrendingUp, Hash, Search,
} from "lucide-react";
import { useStorePurchases } from "@/lib/hooks/queries/useStorePurchases";
import { useAdminStore } from "@/lib/stores/adminStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

type Purchase = NonNullable<ReturnType<typeof useStorePurchases>["data"]>[number];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function PurchasesPage() {
  const router = useRouter();
  const { selectedLocationId } = useAdminStore();
  const { data: purchases, isLoading } = useStorePurchases();
  const [search, setSearch] = useState("");

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthPurchases = useMemo(
    () =>
      (purchases ?? []).filter((p) =>
        isWithinInterval(parseISO(p.purchased_at), { start: monthStart, end: monthEnd })
      ),
    [purchases, monthStart, monthEnd]
  );

  const totalSpentThisMonth = monthPurchases.reduce((sum, p) => sum + p.total_cost, 0);

  const filtered = useMemo(() => {
    if (!search.trim()) return purchases ?? [];
    const q = search.toLowerCase();
    return (purchases ?? []).filter(
      (p) =>
        p.supplier_name?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [purchases, search]);

  if (!selectedLocationId) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-zinc-200">
        <p className="text-zinc-500">Select a location from the sidebar to view purchases.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Spent this month</p>
            {isLoading ? (
              <Skeleton className="h-5 w-24 mt-1" />
            ) : (
              <p className="text-lg font-semibold text-zinc-900">{formatCurrency(totalSpentThisMonth)}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <Hash className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Purchases this month</p>
            {isLoading ? (
              <Skeleton className="h-5 w-12 mt-1" />
            ) : (
              <p className="text-lg font-semibold text-zinc-900">{monthPurchases.length}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Total purchases</p>
            {isLoading ? (
              <Skeleton className="h-5 w-12 mt-1" />
            ) : (
              <p className="text-lg font-semibold text-zinc-900">{(purchases ?? []).length}</p>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by supplier or ID…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button asChild>
          <Link href="/admin/purchases/new">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Link>
        </Button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-zinc-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              {search ? "No purchases match your search." : "No purchases recorded yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filtered.map((purchase) => (
              <Link
                key={purchase.id}
                href={`/admin/purchases/${purchase.id}`}
                className="px-6 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="bg-indigo-50 p-2 rounded-lg shrink-0">
                    <ShoppingBag className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {purchase.supplier_name ?? "No supplier"}
                    </p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <CalendarDays className="h-3 w-3" />
                      {format(parseISO(purchase.purchased_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-900">
                    {formatCurrency(purchase.total_cost)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {purchase.store_purchase_items?.length ?? 0} item
                    {(purchase.store_purchase_items?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `date-fns` is not installed: `npm install date-fns`. If it's already used in the project, skip the install.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/admin/purchases/
git commit -m "feat: add purchases list page"
```

---

## Task 8: New purchase form

**Files:**
- Create: `components/admin/purchases/NewPurchaseForm.tsx`
- Create: `app/(dashboard)/admin/purchases/new/page.tsx`

- [ ] **Step 1: Create NewPurchaseForm.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useCreateStorePurchase } from "@/lib/hooks/queries/useStorePurchases";
import { useItems } from "@/lib/hooks/queries/useItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const lineItemSchema = z.object({
  itemId:   z.number({ required_error: "Select an item" }).min(1, "Select an item"),
  quantity: z.number({ required_error: "Required" }).positive("Must be > 0"),
  unitCost: z.number({ required_error: "Required" }).min(0, "Must be ≥ 0"),
});

const formSchema = z.object({
  purchasedAt:  z.string().min(1, "Date is required"),
  supplierName: z.string().optional(),
  notes:        z.string().optional(),
  items:        z.array(lineItemSchema).min(1, "Add at least one item"),
});

type FormData = z.infer<typeof formSchema>;

export default function NewPurchaseForm() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { user } = useUser();
  const { selectedLocationId } = useAdminStore();
  const { data: catalogItems } = useItems();
  const createMutation = useCreateStorePurchase();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchasedAt: format(new Date(), "yyyy-MM-dd"),
      supplierName: "",
      notes: "",
      items: [{ itemId: 0, quantity: 1, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const runningTotal = watchedItems.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0),
    0
  );

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const onSubmit = async (data: FormData) => {
    if (!organization?.id || !user?.id || !selectedLocationId) {
      toast.error("Missing org, user, or location context");
      return;
    }
    try {
      const purchaseId = await createMutation.mutateAsync({
        orgId:        organization.id,
        locationId:   selectedLocationId,
        purchasedBy:  user.id,
        purchasedAt:  new Date(data.purchasedAt).toISOString(),
        supplierName: data.supplierName || null,
        notes:        data.notes || null,
        items:        data.items.map((i) => ({
          itemId:   i.itemId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      });
      toast.success("Purchase recorded and inventory updated");
      router.push(`/admin/purchases/${purchaseId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save purchase");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Header fields */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-900">Purchase Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="purchasedAt">Purchase Date *</Label>
            <Input
              id="purchasedAt"
              type="date"
              {...register("purchasedAt")}
            />
            {errors.purchasedAt && (
              <p className="text-xs text-red-500">{errors.purchasedAt.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplierName">Supplier (optional)</Label>
            <Input
              id="supplierName"
              placeholder="e.g. Local Market, Costco"
              {...register("supplierName")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional details…"
            rows={2}
            {...register("notes")}
          />
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-900">Items</h2>
        {errors.items?.root && (
          <p className="text-xs text-red-500">{errors.items.root.message}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => {
            const lineTotal = (watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitCost || 0);
            return (
              <div key={field.id} className="grid grid-cols-[1fr_100px_120px_80px_32px] gap-2 items-start">
                {/* Item select */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Item</Label>}
                  <Select
                    onValueChange={(v) => setValue(`items.${index}.itemId`, Number(v))}
                    defaultValue={watchedItems[index]?.itemId ? String(watchedItems[index].itemId) : undefined}
                  >
                    <SelectTrigger className={errors.items?.[index]?.itemId ? "border-red-400" : ""}>
                      <SelectValue placeholder="Select item…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogItems ?? []).map((item: any) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Qty</Label>}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    className={errors.items?.[index]?.quantity ? "border-red-400" : ""}
                  />
                </div>

                {/* Unit cost */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Unit cost ($)</Label>}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                    className={errors.items?.[index]?.unitCost ? "border-red-400" : ""}
                  />
                </div>

                {/* Line total */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Total</Label>}
                  <div className="h-9 flex items-center text-sm text-zinc-600 font-medium">
                    {formatCurrency(lineTotal)}
                  </div>
                </div>

                {/* Remove */}
                <div className={index === 0 ? "mt-6" : ""}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-zinc-400 hover:text-red-500"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ itemId: 0, quantity: 1, unitCost: 0 })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add item
        </Button>
      </div>

      {/* Footer with total + submit */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">Total</p>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(runningTotal)}</p>
        </div>
        <Button type="submit" disabled={createMutation.isPending} className="px-8">
          {createMutation.isPending ? "Saving…" : "Save Purchase"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create the page**

```typescript
// app/(dashboard)/admin/purchases/new/page.tsx
import NewPurchaseForm from "@/components/admin/purchases/NewPurchaseForm";

export default function NewPurchasePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Record Purchase</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Log items your store bought directly. Inventory will update immediately.
        </p>
      </div>
      <NewPurchaseForm />
    </div>
  );
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/purchases/NewPurchaseForm.tsx app/\(dashboard\)/admin/purchases/new/
git commit -m "feat: add new purchase form page"
```

---

## Task 9: Purchase detail page

**Files:**
- Create: `components/admin/purchases/PurchaseDetail.tsx`
- Create: `app/(dashboard)/admin/purchases/[id]/page.tsx`

- [ ] **Step 1: Create PurchaseDetail.tsx**

```typescript
"use client";

import { useStorePurchase } from "@/lib/hooks/queries/useStorePurchases";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { CalendarDays, User, Store, Receipt } from "lucide-react";

interface Props {
  id: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default function PurchaseDetail({ id }: Props) {
  const { data: purchase, isLoading } = useStorePurchase(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-zinc-200">
        <p className="text-zinc-500">Purchase not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {purchase.supplier_name ?? "No supplier"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">{purchase.id}</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(purchase.total_cost)}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-zinc-600">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            <span>{format(parseISO(purchase.purchased_at), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600">
            <User className="h-4 w-4 text-zinc-400" />
            <span>Recorded by {purchase.purchased_by}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600">
            <Receipt className="h-4 w-4 text-zinc-400" />
            <span>Recorded {format(parseISO(purchase.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>

        {purchase.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-500 mb-1">Notes</p>
            <p className="text-sm text-zinc-700">{purchase.notes}</p>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900 text-sm">Items Purchased</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-6 py-3 text-left">Item</th>
              <th className="px-6 py-3 text-right">Qty</th>
              <th className="px-6 py-3 text-right">Unit Cost</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(purchase.store_purchase_items ?? []).map((lineItem: any) => (
              <tr key={lineItem.id} className="hover:bg-zinc-50">
                <td className="px-6 py-3 font-medium text-zinc-900">
                  {lineItem.items?.name ?? "—"}
                  {lineItem.items?.unit_of_measure && (
                    <span className="text-xs text-zinc-400 ml-1">
                      ({lineItem.items.unit_of_measure})
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-right text-zinc-700">{lineItem.quantity}</td>
                <td className="px-6 py-3 text-right text-zinc-700">
                  {formatCurrency(lineItem.unit_cost)}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-zinc-900">
                  {formatCurrency(lineItem.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50">
              <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-zinc-700">
                Total
              </td>
              <td className="px-6 py-3 text-right text-base font-bold text-zinc-900">
                {formatCurrency(purchase.total_cost)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the page**

```typescript
// app/(dashboard)/admin/purchases/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PurchaseDetail from "@/components/admin/purchases/PurchaseDetail";

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <Link
        href="/admin/purchases"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Purchases
      </Link>
      <PurchaseDetail id={id} />
    </div>
  );
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/purchases/PurchaseDetail.tsx app/\(dashboard\)/admin/purchases/\[id\]/
git commit -m "feat: add purchase detail page"
```

---

## Task 10: Inventory update requests — query functions

**Files:**
- Create: `lib/supabase/queries/inventoryUpdateRequests.ts`

- [ ] **Step 1: Create the file**

```typescript
"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CreateInventoryUpdateRequestInput {
  orgId:           string;
  locationId:      string;
  storageSpaceId:  string | null;
  itemId:          number;
  requestedBy:     string;
  actionType:      "count" | "adjustment" | "used";
  newQuantity:     number;
  previousQuantity: number;
  notes?:          string | null;
}

export async function createInventoryUpdateRequest(
  input: CreateInventoryUpdateRequestInput
): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Replace any existing pending request for the same item+location+storage slot
  const { error: deleteError } = await supabase
    .from("inventory_update_requests")
    .delete()
    .eq("item_id",     input.itemId)
    .eq("location_id", input.locationId)
    .is("storage_space_id", input.storageSpaceId)
    .eq("status",     "pending");

  if (deleteError) throw deleteError;

  const { error } = await supabase.from("inventory_update_requests").insert({
    org_id:            input.orgId,
    location_id:       input.locationId,
    storage_space_id:  input.storageSpaceId,
    item_id:           input.itemId,
    requested_by:      input.requestedBy,
    action_type:       input.actionType,
    new_quantity:      input.newQuantity,
    previous_quantity: input.previousQuantity,
    notes:             input.notes ?? null,
    status:            "pending",
  });

  if (error) throw error;
}

export async function getInventoryUpdateRequests(
  orgId: string,
  status?: "pending" | "approved" | "rejected"
) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("inventory_update_requests")
    .select(`
      id,
      org_id,
      location_id,
      storage_space_id,
      item_id,
      requested_by,
      action_type,
      new_quantity,
      previous_quantity,
      notes,
      status,
      reviewed_by,
      reviewed_at,
      review_note,
      created_at,
      items ( id, name, unit_of_measure ),
      storage_spaces ( id, name )
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPendingRequestsForItem(
  itemId: number,
  locationId: string,
  storageSpaceId: string | null
) {
  const supabase = createServerSupabaseClient();
  const query = supabase
    .from("inventory_update_requests")
    .select("id, status, new_quantity, created_at")
    .eq("item_id",     itemId)
    .eq("location_id", locationId)
    .eq("status",      "pending");

  const { data, error } = storageSpaceId
    ? await query.eq("storage_space_id", storageSpaceId)
    : await query.is("storage_space_id", null);

  if (error) throw error;
  return data;
}

export async function approveInventoryUpdateRequest(
  requestId: string,
  reviewedBy: string
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("approve_inventory_update_request", {
    p_request_id:  requestId,
    p_reviewed_by: reviewedBy,
  });
  if (error) throw error;
}

export async function rejectInventoryUpdateRequest(
  requestId: string,
  reviewedBy: string,
  reviewNote?: string | null
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("reject_inventory_update_request", {
    p_request_id:  requestId,
    p_reviewed_by: reviewedBy,
    p_review_note: reviewNote ?? null,
  });
  if (error) throw error;
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/queries/inventoryUpdateRequests.ts
git commit -m "feat: add inventory update request query functions"
```

---

## Task 11: Inventory update requests — React Query hooks

**Files:**
- Create: `lib/hooks/queries/useInventoryUpdateRequests.ts`

- [ ] **Step 1: Create the file**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@clerk/nextjs";
import {
  getInventoryUpdateRequests,
  getPendingRequestsForItem,
  createInventoryUpdateRequest,
  approveInventoryUpdateRequest,
  rejectInventoryUpdateRequest,
  type CreateInventoryUpdateRequestInput,
} from "@/lib/supabase/queries/inventoryUpdateRequests";

export const inventoryRequestKeys = {
  all:     ["inventory-update-requests"] as const,
  lists:   () => [...inventoryRequestKeys.all, "list"] as const,
  byOrg:   (orgId: string, status?: string) =>
    [...inventoryRequestKeys.lists(), orgId, status ?? "all"] as const,
  pending: (itemId: number, locationId: string, storageSpaceId: string | null) =>
    [...inventoryRequestKeys.all, "pending", itemId, locationId, storageSpaceId] as const,
};

export function useInventoryUpdateRequests(status?: "pending" | "approved" | "rejected") {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  return useQuery({
    queryKey: inventoryRequestKeys.byOrg(orgId ?? "", status),
    queryFn:  () => getInventoryUpdateRequests(orgId!, status),
    enabled:  !!orgId,
    staleTime: 15_000,
  });
}

export function usePendingRequestForItem(
  itemId: number | undefined,
  locationId: string | undefined,
  storageSpaceId: string | null
) {
  return useQuery({
    queryKey: inventoryRequestKeys.pending(itemId ?? 0, locationId ?? "", storageSpaceId),
    queryFn:  () => getPendingRequestsForItem(itemId!, locationId!, storageSpaceId),
    enabled:  !!itemId && !!locationId,
    staleTime: 10_000,
  });
}

export function useCreateInventoryUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInventoryUpdateRequestInput) =>
      createInventoryUpdateRequest(input),
    onSuccess: () => {
      // Invalidate root key so both list queries AND usePendingRequestForItem refresh
      queryClient.invalidateQueries({ queryKey: inventoryRequestKeys.all });
    },
  });
}

export function useApproveInventoryUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reviewedBy }: { requestId: string; reviewedBy: string }) =>
      approveInventoryUpdateRequest(requestId, reviewedBy),
    onSuccess: () => {
      // Invalidate root key so employee pending badges also clear
      queryClient.invalidateQueries({ queryKey: inventoryRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useRejectInventoryUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      reviewedBy,
      reviewNote,
    }: {
      requestId: string;
      reviewedBy: string;
      reviewNote?: string | null;
    }) => rejectInventoryUpdateRequest(requestId, reviewedBy, reviewNote),
    onSuccess: () => {
      // Invalidate root key so employee pending badges also clear
      queryClient.invalidateQueries({ queryKey: inventoryRequestKeys.all });
    },
  });
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/queries/useInventoryUpdateRequests.ts
git commit -m "feat: add React Query hooks for inventory update requests"
```

---

## Task 12: Route employee quantity updates through approval flow

**Files:**
- Modify: `components/admin/inventory/QuantityUpdateModal.tsx`

The existing `QuantityUpdateModal` is used by both admins and employees. The change: if the acting user is an employee (role = `member`), submit a request instead of calling `updateQuantity` directly. Admins keep the existing direct-update path.

- [ ] **Step 1: Read the current file**

Read `components/admin/inventory/QuantityUpdateModal.tsx` in full before editing.

- [ ] **Step 2: Add imports for approval flow**

At the top of the file, add these imports alongside the existing ones:

```typescript
import { useCreateInventoryUpdateRequest } from "@/lib/hooks/queries/useInventoryUpdateRequests";
import { usePendingRequestForItem } from "@/lib/hooks/queries/useInventoryUpdateRequests";
import { useOrganization } from "@clerk/nextjs";
import { Clock } from "lucide-react";
```

- [ ] **Step 3: Add role detection and approval hooks inside the component**

Inside the component function body, after the existing hook calls, add:

```typescript
  const { organization } = useOrganization();
  const requestMutation = useCreateInventoryUpdateRequest();

  // Detect role from Clerk session claims
  const isEmployee = (userInfo as any)?.members?.role === "member";

  const { data: pendingRequests } = usePendingRequestForItem(
    itemId ? Number(itemId) : undefined,
    locationId,
    storageSpaceId
  );
  const hasPendingRequest = (pendingRequests?.length ?? 0) > 0;
```

- [ ] **Step 4: Replace the `onSubmit` body with role-aware routing**

Find the `onSubmit` function and replace its try/catch body:

```typescript
    try {
      if (isEmployee) {
        // Route through approval queue — does not touch inventory directly
        await requestMutation.mutateAsync({
          orgId:            organization?.id ?? "",
          locationId,
          storageSpaceId,
          itemId:           Number(itemId),
          requestedBy:      userInfo?.id ?? "",
          actionType:       data.action_type as "count" | "adjustment" | "used",
          newQuantity:      data.new_quantity,
          previousQuantity: currentQuantity,
          notes:            data.notes || null,
        });
        toast.success("Update submitted for admin approval");
        onSuccess();
      } else {
        // Admin path — direct update (existing behaviour)
        await updateMutation.mutateAsync({
          itemId,
          locationId,
          storageSpaceId,
          newQuantity: data.new_quantity,
          userId: userInfo?.id || "",
          actionType: data.action_type,
          notes: data.notes,
          minQuantityOverride: data.min_quantity_override ?? null,
          isOverride: data.is_override || false,
          overrideReason: data.override_reason || null,
          overrideAdminId: data.is_override ? userInfo?.id || "" : null,
        });
        toast.success("Quantity updated successfully");
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update quantity");
    }
```

- [ ] **Step 5: Add "Pending approval" banner for employees**

Inside the JSX, just before the submit button, add:

```tsx
      {isEmployee && hasPendingRequest && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
          <Clock className="h-4 w-4 shrink-0" />
          <span>You have a pending update request for this item awaiting admin approval.</span>
        </div>
      )}
```

- [ ] **Step 6: Update submit button label for employees**

Find the submit button and update its label logic:

```tsx
      <Button type="submit" className="w-full" disabled={updateMutation.isPending || requestMutation.isPending}>
        {(updateMutation.isPending || requestMutation.isPending)
          ? "Saving…"
          : isEmployee
          ? "Submit for Approval"
          : "Update Quantity"}
      </Button>
```

- [ ] **Step 7: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `userInfo?.members?.role` path doesn't match, check `useUserInfo` return type and adjust the role check to whatever field holds the Clerk role.

- [ ] **Step 8: Commit**

```bash
git add components/admin/inventory/QuantityUpdateModal.tsx
git commit -m "feat: route employee quantity updates through admin approval flow"
```

---

## Task 13: Add PendingRequestsPanel to admin inventory page

**Files:**
- Create: `components/admin/inventory/PendingRequestsPanel.tsx`
- Modify: `app/(dashboard)/admin/inventory/page.tsx`

- [ ] **Step 1: Create PendingRequestsPanel.tsx**

```typescript
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useInventoryUpdateRequests,
  useApproveInventoryUpdateRequest,
  useRejectInventoryUpdateRequest,
} from "@/lib/hooks/queries/useInventoryUpdateRequests";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

type Tab = "pending" | "history";

export default function PendingRequestsPanel() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data: pendingRequests, isLoading: pendingLoading } =
    useInventoryUpdateRequests("pending");
  const { data: historyRequests, isLoading: historyLoading } =
    useInventoryUpdateRequests(tab === "history" ? undefined : undefined);

  const approveMutation = useApproveInventoryUpdateRequest();
  const rejectMutation  = useRejectInventoryUpdateRequest();

  const handleApprove = async (requestId: string) => {
    if (!user?.id) return;
    try {
      await approveMutation.mutateAsync({ requestId, reviewedBy: user.id });
      toast.success("Request approved and inventory updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user?.id) return;
    try {
      await rejectMutation.mutateAsync({
        requestId,
        reviewedBy: user.id,
        reviewNote: rejectNote || null,
      });
      toast.success("Request rejected");
      setRejectingId(null);
      setRejectNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    }
  };

  const { data: allRequests, isLoading: allLoading } =
    useInventoryUpdateRequests();
  const reviewed = (allRequests ?? []).filter(
    (r) => r.status === "approved" || r.status === "rejected"
  );

  const pending = pendingRequests ?? [];
  const isLoading = tab === "pending" ? pendingLoading : allLoading;
  const requests  = tab === "pending" ? pending : reviewed;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-100">
        <button
          className={`px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "pending"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
          onClick={() => setTab("pending")}
        >
          Pending Requests
          {pending.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
              {pending.length}
            </span>
          )}
        </button>
        <button
          className={`px-5 py-3 text-sm font-medium transition-colors ${
            tab === "history"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="divide-y divide-zinc-50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">
            {tab === "pending" ? "No pending requests." : "No request history."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {requests.map((req) => (
            <div key={req.id} className="px-6 py-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-zinc-900">
                      {(req as any).items?.name ?? `Item #${req.item_id}`}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {req.action_type}
                    </Badge>
                    {req.status !== "pending" && (
                      <Badge
                        variant={req.status === "approved" ? "default" : "destructive"}
                        className="text-xs capitalize"
                      >
                        {req.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(req as any).storage_spaces?.name
                      ? `${(req as any).storage_spaces.name} · `
                      : ""}
                    {req.previous_quantity} → {req.new_quantity}
                    {" "}
                    {(req as any).items?.unit_of_measure ?? "units"}
                    {" · "}
                    {req.requested_by}
                    {" · "}
                    {format(parseISO(req.created_at), "MMM d, h:mm a")}
                  </p>
                  {req.notes && (
                    <p className="text-xs text-zinc-400 mt-0.5 italic">"{req.notes}"</p>
                  )}
                  {req.review_note && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Admin note: {req.review_note}
                    </p>
                  )}
                </div>

                {req.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    {rejectingId === req.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Textarea
                          placeholder="Rejection reason (optional)"
                          rows={2}
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={rejectMutation.isPending}
                            onClick={() => handleReject(req.id)}
                          >
                            Confirm Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setRejectingId(null); setRejectNote(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          disabled={approveMutation.isPending}
                          onClick={() => handleApprove(req.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => setRejectingId(req.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add PendingRequestsPanel to the admin inventory page**

Open `app/(dashboard)/admin/inventory/page.tsx`. Add the import at the top:

```typescript
import PendingRequestsPanel from "@/components/admin/inventory/PendingRequestsPanel";
```

Then, inside the JSX return (inside the `selectedLocationId` branch, after the main inventory grid/matrix component), add:

```tsx
<div className="mt-8">
  <h3 className="text-base font-semibold text-zinc-900 mb-3">Employee Update Requests</h3>
  <PendingRequestsPanel />
</div>
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Visit:
1. `/admin/purchases` — should show stats bar, empty list, "New Purchase" button
2. `/admin/purchases/new` — should show form with date, supplier, notes, line items
3. Create a purchase with 2 items — should redirect to detail page showing the purchase
4. `/admin/inventory` — should show "Employee Update Requests" panel at the bottom
5. Log in as an employee and open the quantity update modal — button should say "Submit for Approval"
6. Submit a quantity change as employee → check it appears in the admin inventory page requests panel
7. Approve the request → verify inventory updates in the inventory view

- [ ] **Step 5: Commit**

```bash
git add components/admin/inventory/PendingRequestsPanel.tsx app/\(dashboard\)/admin/inventory/page.tsx
git commit -m "feat: add pending requests panel to admin inventory page"
```

---

## Done

After Task 13, all features from the spec are implemented:

- ✅ `store_purchases` + `store_purchase_items` tables with atomic `create_store_purchase()` RPC
- ✅ `inventory_update_requests` table with `approve_inventory_update_request()` / `reject_inventory_update_request()` PG functions
- ✅ TypeScript types for all new tables
- ✅ `/admin/purchases` list, new, and detail pages
- ✅ Purchases entry in admin sidebar
- ✅ Employee quantity updates routed through approval queue
- ✅ Admin inventory page shows pending requests with approve/reject
