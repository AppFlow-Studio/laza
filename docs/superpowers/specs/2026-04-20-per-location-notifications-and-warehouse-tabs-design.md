# Per-Location Notification Preferences & Warehouse Detail Tabs

**Date:** 2026-04-20  
**Status:** Approved

---

## Overview

Extend the warehouse detail page with three new tabs (Thresholds, Expenses, Notifications), move notification preferences from a global settings page to per-location management, and propagate the same `LocationNotificationPreferences` component to store detail pages and the admin dashboard.

---

## 1. Database Migration

**Table:** `notification_preferences`

- Add column: `location_id uuid REFERENCES locations(id) ON DELETE CASCADE`
- Drop constraint: `UNIQUE (organization_id)`
- Add constraint: `UNIQUE (organization_id, location_id)`

Each location (warehouse or store) gets its own row. There is no longer an org-wide default row.

---

## 2. Query & Hook Layer

All notification preference queries gain a required `locationId` parameter:

- `getNotificationPreferences(organizationId, locationId)` — fetch by org + location
- `upsertNotificationPreferences(data)` — upsert by `(organization_id, location_id)`

React Query hooks (`useNotificationPreferences`, `useUpsertNotificationPreferences`) updated to accept and key by `locationId`.

Backend email services (low stock alerts, daily summary) switch from org-level preference lookup to lookup by the triggering `location_id`.

---

## 3. Shared Component: `LocationNotificationPreferences`

**Path:** `components/location-notification-preferences.tsx`

**Props:** `{ locationId: string }`

Renders the existing notification sub-components as internal tabs, with `locationId` threaded through each:

| Tab | Component |
|-----|-----------|
| General | `GeneralNotificationPreferences` |
| Low Stock | `LowStockAlertPreferences` |
| Thresholds | `LowStockThresholdManager` |
| Daily Summary | `DailySummaryPreferences` |

`EmailDeliveryLogs` is excluded — logs remain accessible elsewhere if needed.

---

## 4. Warehouse Detail Page

**Path:** `app/(dashboard)/super-admin/warehouse/[id]/page.tsx`

`TabId` expands to: `"inventory" | "shipments" | "pallets" | "thresholds" | "expenses" | "notifications"`

New tabs:

| Tab | Content |
|-----|---------|
| **Thresholds** | `<LowStockThresholdManager locationId={warehouseLocationId} />` |
| **Expenses** | Existing expenses UI components filtered by this warehouse's ID |
| **Notifications** | `<LocationNotificationPreferences locationId={warehouseLocationId} />` |

`warehouseLocationId` comes from the existing warehouse fetch query.

---

## 5. Store Detail Page

**Path:** `app/(dashboard)/super-admin/stores/[id]/page.tsx`

Add a **Notifications** tab:

```tsx
<LocationNotificationPreferences locationId={storeLocationId} />
```

`storeLocationId` comes from the existing store fetch.

---

## 6. Admin Dashboard

The per-location settings or profile area in the admin dashboard gets a **Notifications** tab:

```tsx
<LocationNotificationPreferences locationId={currentLocationId} />
```

`currentLocationId` comes from `adminStore` (already tracks selected location).

---

## 7. Global Settings Page

**Path:** `app/(dashboard)/super-admin/settings/notifications/page.tsx`

- **Nav link**: Comment out in the settings sidebar so users cannot navigate to it. The page file is preserved.
- **Standalone sidebar pages** (`/super-admin/warehouse/thresholds`, `/super-admin/warehouse/expenses`): Kept as-is for global data monitoring.

---

## Out of Scope

- Migrating existing org-wide notification preference data (no existing data to migrate)
- `EmailDeliveryLogs` per-location view
- Any changes to the standalone global thresholds/expenses sidebar pages
