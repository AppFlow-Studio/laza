# E2E Test Flows Design

**Date:** 2026-04-29  
**Scope:** Manual, role-by-role test scenarios for local verification  
**Roles covered:** Public (no login), Employee, Admin, Super Admin  
**Coverage:** Happy path + negative/edge cases per section

---

## Section 1 — Public / Storefront (No Login)

### Happy Path

- Land on `/` → hero section loads, nav links (Menu, About, Catering, Join Us) are all clickable
- Browse `/menu` → items render correctly, filter by category → only matching items shown
- Add item to cart → cart count updates in nav → adjust quantity up/down → remove item → cart empties
- Proceed to `/checkout` → fill in all required fields → submit order → confirmation message shown
- Visit `/about` → page loads without errors
- Visit `/catering` → page loads without errors
- Visit `/join-us` → page loads without errors
- Visit `/privacy-policy` → page loads without errors
- Visit `/terms-conditions` → page loads without errors

### Negative Cases

- Navigate to `/admin` without being logged in → redirected to `/sign-in`
- Navigate to `/employee` without being logged in → redirected to `/sign-in`
- Navigate to `/super-admin` without being logged in → redirected to `/sign-in`
- Go to `/checkout` with an empty cart → placing order is blocked (no items to submit)

---

## Section 2 — Employee Role (`/employee/*`)

### Happy Path

- Land on `/employee` → dashboard overview loads with relevant data
- Navigate to `/employee/activity` → activity log entries render, can browse/filter
- Navigate to `/employee/profile` → profile information renders, edit fields and save → changes persist
- Navigate to `/employee/storage-spaces` → list of assigned storage spaces loads
- Click into a storage space → `/employee/storage-spaces/[id]` → detail view loads, inventory items shown

### Negative Cases

- Manually navigate to `/admin/*` → 403 Unauthorized
- Manually navigate to `/super-admin/*` → 403 Unauthorized
- Edit profile with missing required fields → form shows validation error, does not save

---

## Section 3 — Admin Role (`/admin/*`)

### Happy Path

**Dashboard**
- Land on `/admin` → overview dashboard loads with stats and summaries

**Inventory**
- Navigate to `/admin/inventory` → inventory list loads
- Filter by location → correct items shown for selected location

**Items**
- Navigate to `/admin/items` → items list loads
- Create new item → fill all required fields → save → item appears in list
- Edit existing item → change fields → save → changes reflected in list
- Delete item → confirm deletion → item removed from list

**Categories**
- Navigate to `/admin/categories` → categories list loads
- Create new category → save → appears in list
- Edit existing category → save → changes reflected
- Delete category → confirm → removed from list

**Orders**
- Navigate to `/admin/orders` → orders list loads
- Create new order at `/admin/orders/new` → add items → submit → new order appears in list
- Click into an order → `/admin/orders/[id]` → order detail loads with correct data

**Storage Spaces**
- Navigate to `/admin/storage-spaces` → list loads
- Click into a storage space → detail view loads with inventory breakdown

**Users**
- Navigate to `/admin/users` → users list loads with roles visible

**Notification Settings**
- Navigate to `/admin/settings/notifications` → current preferences load
- Toggle a setting → save → refresh page → setting persists

### Negative Cases

- Create item with missing required fields → validation error shown, item not saved
- Create order with no items added → submit is blocked or shows error
- Manually navigate to `/super-admin/*` → 403 Unauthorized

---

## Section 4 — Super Admin Role (`/super-admin/*`)

### Happy Path

**Dashboard**
- Land on `/super-admin` → overview dashboard loads with cross-location stats

**Locations**
- Navigate to `/super-admin/locations` → list of all locations loads
- Create new location at `/super-admin/locations/new` → fill fields → save → appears in list
- Click into a location → `/super-admin/locations/[id]` → detail loads, storage spaces listed
- Click into a storage space from location detail → storage space detail loads with inventory

**Stores**
- Navigate to `/super-admin/stores` → stores list loads
- Create new store at `/super-admin/stores/new` → fill fields → save → appears in list
- Click into a store → detail loads showing catalog items and storage spaces
- Click into a storage space from store detail → storage space detail loads

**Items / Catalog**
- Navigate to `/super-admin/items` → full catalog loads
- Create new item → fill fields → save → appears in list
- Edit existing item → save → changes reflected
- Select multiple items → apply bulk markup → prices updated across all selected items

**Categories**
- Navigate to `/super-admin/categories` → list loads
- Create, edit, delete category → changes reflected after each action

**Inventory**
- Navigate to `/super-admin/inventory` → inventory across all locations loads
- Filter by location → correct subset shown

**Purchase Orders**
- Navigate to `/super-admin/purchase-orders` → list loads
- Create new PO at `/super-admin/purchase-orders/new` → add items with quantities → submit → appears in list
- Click into a PO → `/super-admin/purchase-orders/[id]` → detail loads correctly
- Receive a PO at `/super-admin/purchase-orders/[id]/receive` → mark items as received → inventory updates accordingly

**Orders**
- Navigate to `/super-admin/orders` → orders list loads
- Create new order at `/super-admin/orders/new` → add items → submit → appears in list
- Click into an order → order detail loads correctly

**Warehouse**
- Navigate to `/super-admin/warehouse` → warehouse list loads
- Create new warehouse at `/super-admin/warehouse/new` → save → appears in list
- Click into a warehouse → `/super-admin/warehouse/[id]` → detail page loads
- Navigate to pallets within warehouse → pallet list loads
- Click into a pallet → pallet detail loads with items
- Go to `/super-admin/warehouse/[id]/pallets/reorganize` → reorder pallets → save → changes reflected
- Create a warehouse PO → add items → submit → appears in warehouse PO list
- Receive a warehouse PO → mark items received → pallet/inventory updates

**Warehouse Expenses**
- Navigate to `/super-admin/warehouse/expenses` → expenses list loads
- Add a new expense entry → save → appears in list

**Warehouse Employees**
- Navigate to `/super-admin/warehouse/employees` → employee list for warehouse loads

**Warehouse Thresholds**
- Navigate to `/super-admin/warehouse/thresholds` → thresholds list loads
- Set or edit a threshold for an item → save → persists on refresh

**Users**
- Navigate to `/super-admin/users` → all org users load with roles visible

**Analytics**
- Navigate to `/super-admin/analytics` → overview report loads with charts and data
- Navigate to `/super-admin/analytics/costs` → cost breakdown report loads
- Navigate to `/super-admin/analytics/distribution` → distribution report loads

**Notification Settings**
- Navigate to `/super-admin/settings/notifications` → preferences load
- Toggle a setting → save → refresh page → setting persists

### Negative Cases

- Create a purchase order with no items → submit is blocked or shows validation error
- Attempt to receive more units than the ordered quantity on a PO → error shown or quantity capped at ordered amount
- Create a warehouse with missing required fields → validation error shown, not saved
- Apply bulk markup with no items selected → action is disabled or shows a warning
