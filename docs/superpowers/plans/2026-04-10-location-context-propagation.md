# Location Context Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `selectedLocationId` from `adminStore` into the Dashboard, Users, and Orders pages so switching location in the sidebar immediately scopes all page data to that location.

**Architecture:** `adminStore` (Zustand, persisted) already holds `selectedLocationId` and `SidebarLocationBlock` already sets it. Each page/component reads `selectedLocationId` via `useAdminStore()` and passes it to hooks that already accept a `locationId`/`storeLocationId` filter — no new queries or data layers needed.

**Tech Stack:** Next.js App Router, Zustand (`useAdminStore`), TanStack React Query, Supabase

---

## File Map

| File | Change |
|---|---|
| `app/(dashboard)/admin/page.tsx` | Pass `locationId` to `useAlerts` |
| `components/admin/dashboard/ImmediateActions.tsx` | Read `selectedLocationId` from adminStore, pass to `useAlerts` |
| `components/admin/dashboard/ActivityFeed.tsx` | Read `selectedLocationId` from adminStore, pass to `useInventoryLogs` |
| `app/(dashboard)/admin/users/page.tsx` | Filter users & stats by `selectedLocationId` |
| `app/(dashboard)/admin/orders/page.tsx` | Pass `selectedLocationId` as `storeLocationId` to `useAllTickets` |

---

### Task 1: Scope dashboard alerts to selected location

**Files:**
- Modify: `app/(dashboard)/admin/page.tsx`

- [ ] **Step 1: Add adminStore import and read selectedLocationId**

In `app/(dashboard)/admin/page.tsx`, add the import and destructure `selectedLocationId`:

```tsx
import { useAdminStore } from '@/lib/stores/adminStore';
```

Inside `AdminDashboard()`, add:

```tsx
const { selectedLocationId } = useAdminStore();
```

- [ ] **Step 2: Pass locationId to useAlerts**

Replace:
```tsx
const { data: alerts, isLoading: alertsLoading } = useAlerts({ resolved: false });
```

With:
```tsx
const { data: alerts, isLoading: alertsLoading } = useAlerts({ resolved: false, locationId: selectedLocationId ?? undefined });
```

- [ ] **Step 3: Verify**

Run `npm run dev`, open `/admin`, switch locations in the sidebar. The "Low Stock Alerts" count should change to reflect only that location's alerts.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/admin/page.tsx"
git commit -m "feat: scope dashboard alert stat to selected location"
```

---

### Task 2: Scope ImmediateActions to selected location

**Files:**
- Modify: `components/admin/dashboard/ImmediateActions.tsx`

- [ ] **Step 1: Add adminStore import and read selectedLocationId**

Add import at the top of `components/admin/dashboard/ImmediateActions.tsx`:

```tsx
import { useAdminStore } from '@/lib/stores/adminStore';
```

Inside `ImmediateActions()`, add before the `useAlerts` call:

```tsx
const { selectedLocationId } = useAdminStore();
```

- [ ] **Step 2: Pass locationId to useAlerts**

Replace:
```tsx
const { data: alerts, isLoading } = useAlerts({ resolved: false });
```

With:
```tsx
const { data: alerts, isLoading } = useAlerts({ resolved: false, locationId: selectedLocationId ?? undefined });
```

- [ ] **Step 3: Verify**

On `/admin` dashboard, switch locations in the sidebar. The "Immediate Actions" section should show only alerts for the selected location.

- [ ] **Step 4: Commit**

```bash
git add "components/admin/dashboard/ImmediateActions.tsx"
git commit -m "feat: scope ImmediateActions alerts to selected location"
```

---

### Task 3: Scope ActivityFeed to selected location

**Files:**
- Modify: `components/admin/dashboard/ActivityFeed.tsx`

- [ ] **Step 1: Add adminStore import and read selectedLocationId**

Add import at the top of `components/admin/dashboard/ActivityFeed.tsx`:

```tsx
import { useAdminStore } from '@/lib/stores/adminStore';
```

Inside `ActivityFeed()`, add before the `useInventoryLogs` call:

```tsx
const { selectedLocationId } = useAdminStore();
```

- [ ] **Step 2: Pass locationId to useInventoryLogs**

Replace:
```tsx
const { data: logs, isLoading } = useInventoryLogs({ limit: 10 });
```

With:
```tsx
const { data: logs, isLoading } = useInventoryLogs({ limit: 10, locationId: selectedLocationId ?? undefined });
```

- [ ] **Step 3: Verify**

On `/admin` dashboard, switch locations in the sidebar. The "Recent Activity" feed should update to show only inventory logs for the selected location.

- [ ] **Step 4: Commit**

```bash
git add "components/admin/dashboard/ActivityFeed.tsx"
git commit -m "feat: scope ActivityFeed logs to selected location"
```

---

### Task 4: Scope Users page to selected location

**Files:**
- Modify: `app/(dashboard)/admin/users/page.tsx`

- [ ] **Step 1: Add adminStore import and read selectedLocationId**

Add import at the top of `app/(dashboard)/admin/users/page.tsx`:

```tsx
import { useAdminStore } from '@/lib/stores/adminStore';
```

Inside `UsersPage()`, add after the existing hooks:

```tsx
const { selectedLocationId } = useAdminStore();
```

- [ ] **Step 2: Add location filter to filteredUsers**

The existing `filteredUsers` useMemo already filters by search/role/status. Add `selectedLocationId` to the dependency array and prepend a location check at the top of the filter:

Replace the entire `filteredUsers` useMemo:
```tsx
const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
        if (selectedLocationId) {
            const inLocation = (user as any).assigned_locations?.some(
                (l: any) => l.id === selectedLocationId
            );
            if (!inLocation) return false;
        }
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
            const email = user.email.toLowerCase();
            if (!name.includes(searchLower) && !email.includes(searchLower)) {
                return false;
            }
        }
        if (roleFilter && user.role !== roleFilter) return false;
        if (statusFilter) {
            const isActive = user.is_active;
            if (statusFilter === 'active' && !isActive) return false;
            if (statusFilter === 'inactive' && isActive) return false;
        }
        return true;
    });
}, [users, debouncedSearch, roleFilter, statusFilter, selectedLocationId]);
```

- [ ] **Step 3: Scope stats to location-filtered users**

Replace the `stats` useMemo so it computes from `filteredUsers` (which is already location-filtered) instead of the raw `users` list:

Replace:
```tsx
const stats = useMemo(() => {
    if (!users) return { active: 0, admins: 0, employees: 0 };
    return {
        active: users.filter((u) => u.is_active).length,
        admins: users.filter((u) => u.role === 'admin').length,
        employees: users.filter((u) => u.role === 'employee').length,
    };
}, [users]);
```

With:
```tsx
const stats = useMemo(() => {
    if (!users) return { active: 0, admins: 0, employees: 0 };
    const base = selectedLocationId
        ? users.filter((u) =>
              (u as any).assigned_locations?.some((l: any) => l.id === selectedLocationId)
          )
        : users;
    return {
        active: base.filter((u) => u.is_active).length,
        admins: base.filter((u) => u.role === 'admin').length,
        employees: base.filter((u) => u.role === 'employee').length,
    };
}, [users, selectedLocationId]);
```

- [ ] **Step 4: Verify**

Open `/admin/users`, switch locations. The user list and the three stat cards should all update to show only users assigned to the selected location.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/admin/users/page.tsx"
git commit -m "feat: filter users and stats by selected location"
```

---

### Task 5: Scope Orders page to selected location

**Files:**
- Modify: `app/(dashboard)/admin/orders/page.tsx`

- [ ] **Step 1: Add adminStore import and read selectedLocationId**

Add import at the top of `app/(dashboard)/admin/orders/page.tsx`:

```tsx
import { useAdminStore } from '@/lib/stores/adminStore';
```

Inside `AdminOrdersPage()`, add after the existing hooks:

```tsx
const { selectedLocationId } = useAdminStore();
```

- [ ] **Step 2: Pass storeLocationId to useAllTickets**

Replace:
```tsx
const { data: tickets, isLoading } = useAllTickets(organizationId, {});
```

With:
```tsx
const { data: tickets, isLoading } = useAllTickets(organizationId, {
    storeLocationId: selectedLocationId ?? undefined,
});
```

- [ ] **Step 3: Verify**

Open `/admin/orders`, switch locations in the sidebar. Only orders with `requesting_location_id` matching the selected location should appear. The stat cards update accordingly.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/admin/orders/page.tsx"
git commit -m "feat: filter orders by selected location"
```
