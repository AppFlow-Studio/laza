# E2E Test Flows Design

**Date:** 2026-04-29  
**Scope:** Manual, cross-role end-to-end journeys for local verification  
**Roles involved:** Super Admin, Admin, Employee  
**Coverage:** 5 business flows, happy path + negative/edge cases per flow

---

## Flow 1 — Item & Catalog Setup

**Roles:** Super Admin

**Steps:**
1. Log in as Super Admin → land on `/super-admin`
2. Navigate to `/super-admin/categories`
3. Create a new category (e.g. "Cakes") → save → verify it appears in the list
4. Navigate to `/super-admin/items`
5. Create a new item → assign it to the "Cakes" category → fill in all required fields → save → verify it appears in the catalog
6. Select 2+ items in the list → open bulk markup → apply a markup percentage → confirm → verify prices updated on the selected items
7. Navigate back to `/super-admin/categories` → edit the "Cakes" category name → save → verify change reflected

**Negative Cases:**
- Create an item with missing required fields → validation error shown, item not saved
- Apply bulk markup with no items selected → action is disabled or shows a warning
- Create a category with a duplicate name → error shown or handled gracefully

---

## Flow 2 — Warehouse Restocking (PO → Receive → Inventory)

**Roles:** Super Admin

**Steps:**
1. Log in as Super Admin → navigate to `/super-admin/warehouse`
2. Create a new warehouse if none exists → save → verify it appears in the list
3. Navigate into the warehouse → go to Purchase Orders → create a new warehouse PO
4. Add items with quantities → submit → verify PO appears in the warehouse PO list
5. Open the PO → navigate to the receive page → mark all items as received → confirm
6. Navigate to `/super-admin/warehouse/[id]/pallets` → verify items now appear in pallets/warehouse inventory
7. Navigate to `/super-admin/inventory` → verify stock levels updated for the relevant items

**Negative Cases:**
- Create a warehouse PO with no items → submit is blocked or shows validation error
- Attempt to receive more units than the ordered quantity → error shown or quantity capped
- Create a warehouse with missing required fields → validation error, not saved

---

## Flow 3 — Store Order & Fulfillment (Super Admin → Admin)

**Roles:** Super Admin, Admin

**Steps:**
1. Log in as Super Admin → navigate to `/super-admin/orders/new`
2. Create a new order targeting a store/location → add items from inventory → submit → verify order appears in `/super-admin/orders`
3. Log out → log in as Admin
4. Navigate to `/admin/orders` → verify the new order appears in the list
5. Open the order → review items and quantities
6. Accept / process the order → confirm
7. Navigate to `/admin/inventory` → verify store inventory updated to reflect the received items
8. Log back in as Super Admin → `/super-admin/orders/[id]` → verify order status updated correctly

**Negative Cases:**
- Admin tries to create an order with no items → submit is blocked
- Super Admin creates an order for a location with insufficient warehouse stock → error or warning shown

---

## Flow 4 — New Location Onboarding (Super Admin → Admin → Employee)

**Roles:** Super Admin, Admin, Employee

**Steps:**
1. Log in as Super Admin → navigate to `/super-admin/locations/new`
2. Create a new location → fill all required fields → save → verify it appears in `/super-admin/locations`
3. Click into the new location → navigate to its storage spaces → create a new storage space → save → verify it appears
4. Log out → log in as Admin
5. Navigate to `/admin/storage-spaces` → verify the new storage space is visible
6. Click into it → verify detail view loads (may be empty inventory at this point)
7. Log out → log in as Employee
8. Navigate to `/employee/storage-spaces` → verify the new storage space is listed
9. Click into it → verify detail view loads correctly

**Negative Cases:**
- Create a location with missing required fields → validation error, not saved
- Employee navigates to `/admin/*` → 403 Unauthorized
- Admin navigates to `/super-admin/*` → 403 Unauthorized

---

## Flow 5 — Threshold Setup & Analytics Check

**Roles:** Super Admin

**Steps:**
1. Log in as Super Admin → navigate to `/super-admin/warehouse/thresholds`
2. Set a low-stock threshold for an existing item (e.g. alert when below 10 units) → save → refresh page → verify threshold persists
3. Edit the threshold value → save → verify the updated value persists
4. Navigate to `/super-admin/analytics` → verify overview report loads with charts and data
5. Navigate to `/super-admin/analytics/costs` → verify cost breakdown report loads
6. Navigate to `/super-admin/analytics/distribution` → verify distribution report loads with data
7. Navigate to `/super-admin/warehouse/expenses` → add a new expense entry → save → verify it appears in the list
8. Return to `/super-admin/analytics/costs` → verify the new expense is reflected in the cost data

**Negative Cases:**
- Set a threshold with a negative or zero value → validation error or blocked
- Analytics pages load with no data available → empty state shown (no crash)
