# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply visual-only UI improvements across sidebars, dashboards, warehouse, store, and orders pages without touching business logic, routing, or data fetching.

**Architecture:** All changes are confined to layout files and page components. New chart components are added as isolated presentational files. The new order item dialog wraps existing `CatalogItemRow` handlers — no handlers change. Branch: `ui-improvements` (local only, merge into `sardor-dev` after review).

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, recharts v3.4.1, lucide-react

---

## File Map

| File | Change |
|------|--------|
| `app/(dashboard)/admin/layout.tsx` | Add section group headers + "New Order" CTA button |
| `app/(dashboard)/super-admin/layout.tsx` | Add section group labels + "New PO" CTA button |
| `app/(dashboard)/super-admin/page.tsx` | Add OrdersStatusChart + OrdersTimelineChart widgets |
| `app/(dashboard)/super-admin/warehouse/[id]/page.tsx` | Add item count badge to Inventory tab, shipment count badge to Shipments tab |
| `app/(dashboard)/super-admin/stores/[id]/page.tsx` | Add analytics section (activity chart + key metric cards) |
| `app/(dashboard)/admin/orders/page.tsx` | Increase table font/row height; add status-grouped "Kanban" view mode |
| `app/(dashboard)/admin/orders/new/page.tsx` | Replace inline qty+config controls in CatalogItemRow with a Dialog |
| `components/super-admin/dashboard/OrdersStatusChart.tsx` | NEW – donut chart: orders by status |
| `components/super-admin/dashboard/OrdersTimelineChart.tsx` | NEW – bar chart: orders created per day (last 7 days) |
| `components/super-admin/stores/StoreActivityChart.tsx` | NEW – area chart: weekly inventory log activity |

---

### Task 1: Admin Sidebar — Section Groups + "New Order" Button

**Files:**
- Modify: `app/(dashboard)/admin/layout.tsx`

The flat nav list gets split into four labelled groups. A "New Order" button is added below the header location block.

- [ ] **Step 1: Replace the single `SidebarGroup` nav block with grouped sections and add the "New Order" button**

Replace the entire `<SidebarContent>` section (lines 254-289 in the current file) with:

```tsx
<SidebarContent>
  {/* ── New Order CTA ── */}
  <div className="px-3 pt-2 pb-1 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:pt-1">
    <Link
      href="/admin/orders/new"
      className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 transition-colors group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:px-0"
    >
      <Plus className="h-3.5 w-3.5 shrink-0" />
      <span className="group-data-[collapsible=icon]:hidden">New Order</span>
    </Link>
  </div>

  {/* ── OPERATIONS ── */}
  <SidebarGroup className="group-data-[collapsible=icon]:px-2 pt-2">
    <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Operations
      </span>
    </div>
    <SidebarGroupContent>
      <SidebarMenu>
        {[navigation[0], navigation[1], navigation[2]].map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  <NavBadge count={badgeCounts[item.href] ?? 0} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>

  {/* ── CATALOG ── */}
  <SidebarGroup className="group-data-[collapsible=icon]:px-2 pt-1">
    <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Catalog
      </span>
    </div>
    <SidebarGroupContent>
      <SidebarMenu>
        {[navigation[3], navigation[4], navigation[5]].map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  <NavBadge count={badgeCounts[item.href] ?? 0} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>

  {/* ── MANAGE ── */}
  <SidebarGroup className="group-data-[collapsible=icon]:px-2 pt-1">
    <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Manage
      </span>
    </div>
    <SidebarGroupContent>
      <SidebarMenu>
        {[navigation[6], navigation[7]].map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  <NavBadge count={badgeCounts[item.href] ?? 0} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>

  <SidebarStorageSpacesBlock />
</SidebarContent>
```

The `navigation` array is currently:
```
[0] Dashboard     /admin
[1] Orders        /admin/orders
[2] Purchases     /admin/purchases
[3] Users         /admin/users
[4] Items         /admin/items
[5] Categories    /admin/categories
[6] Inventory     /admin/inventory
[7] Settings      /admin/settings/notifications
```

So the groups are:
- OPERATIONS: `[0]` Dashboard, `[1]` Orders, `[2]` Purchases
- CATALOG: `[3]` Users → wait, let me re-check. Users doesn't belong in catalog.

Actually re-grouping with cleaner semantics:
- OPERATIONS: Orders `[1]`, Purchases `[2]`
- CATALOG: Items `[4]`, Categories `[5]`, Inventory `[6]`
- MANAGE: Dashboard `[0]` (no, dashboard should be first standalone)

Let me reconsider. Better structure:
- Dashboard `[0]` — no group label (standalone at top)
- OPERATIONS: Orders `[1]`, Purchases `[2]`
- CATALOG: Items `[4]`, Categories `[5]`, Inventory `[6]`
- MANAGE: Users `[3]`, Settings `[7]`

So the actual step 1 code uses:
- First group (no label): Dashboard [0]
- OPERATIONS: Orders [1], Purchases [2]
- CATALOG: Items [4], Categories [5], Inventory [6]
- MANAGE: Users [3], Settings [7]

Also add `Plus` to lucide-react imports.

- [ ] **Step 2: Add `Plus` to the lucide-react import in `admin/layout.tsx`**

Change the import line from:
```tsx
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
To:
```tsx
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
    Plus,
} from "lucide-react";
```

- [ ] **Step 3: Commit**
```bash
git add app/(dashboard)/admin/layout.tsx
git commit -m "feat(ui): admin sidebar section groups + New Order CTA button"
```

---

### Task 2: Super-Admin Sidebar — Section Labels + "New PO" Button

**Files:**
- Modify: `app/(dashboard)/super-admin/layout.tsx`

The super-admin sidebar already has `CollapsibleNavGroup` blocks. We add:
1. A visible section label ("OVERVIEW", "OPERATIONS", "INSIGHTS", "CATALOG") above each group — hidden when collapsed
2. A "New PO" button in the header area

- [ ] **Step 1: Add `Plus` to the lucide-react import**

Change the existing import to add `Plus`:
```tsx
import {
    LayoutDashboard,
    Users,
    Package,
    BarChart3,
    LogOut,
    Home,
    Tags,
    Settings,
    Warehouse,
    Store,
    StretchHorizontal,
    ShoppingCart,
    ChevronDown,
    Building2,
    Thermometer,
    Receipt,
    ArrowsUpFromLine,
    BarChart2,
    LineChart,
    CircleDollarSign,
    ChartColumn,
    Plus,
} from "lucide-react";
```

- [ ] **Step 2: Add "New PO" button to the SidebarHeader (after the logo block, before the closing `</SidebarHeader>`)**

Inside `SidebarHeader`, right after the closing `</div>` of the logo block (before `</SidebarHeader>`), add:
```tsx
{/* New PO CTA */}
<div className="px-2 pt-1 pb-1 group-data-[collapsible=icon]:px-0">
  <Link
    href="/super-admin/purchase-orders/new"
    className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 transition-colors group-data-[collapsible=icon]:py-2"
  >
    <Plus className="h-3.5 w-3.5 shrink-0" />
    <span className="group-data-[collapsible=icon]:hidden">New PO</span>
  </Link>
</div>
```

- [ ] **Step 3: Add section label helpers inside `<SidebarContent>` around each group**

Replace the existing `<SidebarContent>` block (which contains one `<SidebarGroup>`) with this:

```tsx
<SidebarContent>
  <SidebarGroup className="group-data-[collapsible=icon]:px-2 pt-2">
    {/* OVERVIEW */}
    <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Overview
      </span>
    </div>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === "/super-admin"}
            tooltip="Dashboard"
          >
            <Link href="/super-admin">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname?.startsWith("/super-admin/stores")} tooltip="All Stores">
            <Link href="/super-admin/stores">
              <Store className="h-4 w-4" />
              <span>All Stores</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>

    {/* OPERATIONS */}
    <div className="px-3 pb-1 pt-3 group-data-[collapsible=icon]:hidden">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Operations
      </span>
    </div>
    <SidebarGroupContent>
      <SidebarMenu>
        <CollapsibleNavGroup
          label="Warehouse"
          icon={Warehouse}
          basePath="/super-admin/warehouse"
          children={warehouseChildren}
          pathname={pathname}
        />
        {navigation
          .filter((item) => item.name === "Purchase Orders" || item.name === "Orders")
          .map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    <NavBadge count={badgeCounts[item.href] ?? 0} />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        {navigation
          .filter((item) => item.name === "Users")
          .map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
      </SidebarMenu>
    </SidebarGroupContent>

    {/* CATALOG */}
    <div className="px-3 pb-1 pt-3 group-data-[collapsible=icon]:hidden">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Catalog
      </span>
    </div>
    <SidebarGroupContent>
      <SidebarMenu>
        <CollapsibleNavGroup
          label="Catalog"
          icon={Package}
          basePath="/super-admin/items"
          activePaths={["/super-admin/items", "/super-admin/categories"]}
          children={catalogChildren}
          pathname={pathname}
        />
      </SidebarMenu>
    </SidebarGroupContent>

    {/* INSIGHTS */}
    <div className="px-3 pb-1 pt-3 group-data-[collapsible=icon]:hidden">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Insights
      </span>
    </div>
    <SidebarGroupContent>
      <SidebarMenu>
        <CollapsibleNavGroup
          label="Analytics"
          icon={LineChart}
          basePath="/super-admin/analytics"
          children={analyticsChildren}
          pathname={pathname}
        />
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</SidebarContent>
```

- [ ] **Step 4: Commit**
```bash
git add app/(dashboard)/super-admin/layout.tsx
git commit -m "feat(ui): super-admin sidebar section labels + New PO CTA button"
```

---

### Task 3: Super-Admin Dashboard — Charts

**Files:**
- Create: `components/super-admin/dashboard/OrdersStatusChart.tsx`
- Create: `components/super-admin/dashboard/OrdersTimelineChart.tsx`
- Modify: `app/(dashboard)/super-admin/page.tsx`

recharts is already installed (`"recharts": "^3.4.1"`).

- [ ] **Step 1: Create `OrdersStatusChart.tsx` — donut chart of orders by status**

```tsx
// components/super-admin/dashboard/OrdersStatusChart.tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  draft:      "#d1d5db",
  submitted:  "#3b82f6",
  processing: "#f59e0b",
  fulfilled:  "#8b5cf6",
  confirmed:  "#10b981",
  rejected:   "#ef4444",
  cancelled:  "#9ca3af",
};

const STATUS_LABELS: Record<string, string> = {
  draft:      "Draft",
  submitted:  "Submitted",
  processing: "Processing",
  fulfilled:  "Fulfilled",
  confirmed:  "Confirmed",
  rejected:   "Rejected",
  cancelled:  "Cancelled",
};

interface Props {
  tickets: { status: string }[];
}

export function OrdersStatusChart({ tickets }: Props) {
  const counts = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      name: STATUS_LABELS[status] ?? status,
      value,
      color: STATUS_COLORS[status] ?? "#6b7280",
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No orders yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create `OrdersTimelineChart.tsx` — bar chart of orders per day (last 7 days)**

```tsx
// components/super-admin/dashboard/OrdersTimelineChart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  tickets: { created_at: string; status: string }[];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "");
}

export function OrdersTimelineChart({ tickets }: Props) {
  const days = getLast7Days();

  const data = days.map((day) => {
    const dayTickets = tickets.filter((t) => t.created_at.slice(0, 10) === day);
    return {
      day: new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
      total: dayTickets.length,
      confirmed: dayTickets.filter((t) => t.status === "confirmed").length,
      submitted: dayTickets.filter((t) => t.status === "submitted").length,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          cursor={{ fill: "#f9fafb" }}
        />
        <Bar dataKey="submitted" name="Submitted" fill="#3b82f6" radius={[3, 3, 0, 0]} stackId="a" />
        <Bar dataKey="confirmed" name="Confirmed" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Add the charts to the super-admin dashboard page**

In `app/(dashboard)/super-admin/page.tsx`, after the stat grid (`</div>` that closes the `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5` div) and before `{orgId && <ReorderAlertsPreview ... />}`, add:

```tsx
{/* Charts row */}
{!ticketsLoading && allTickets && allTickets.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Orders by Status</h2>
      <p className="text-xs text-gray-400 mb-3">Distribution across all time</p>
      <OrdersStatusChart tickets={allTickets} />
    </div>
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Order Activity</h2>
      <p className="text-xs text-gray-400 mb-3">Last 7 days</p>
      <OrdersTimelineChart tickets={allTickets} />
    </div>
  </div>
)}
```

Also add the imports at the top of `super-admin/page.tsx`:
```tsx
import { OrdersStatusChart } from "@/components/super-admin/dashboard/OrdersStatusChart";
import { OrdersTimelineChart } from "@/components/super-admin/dashboard/OrdersTimelineChart";
```

- [ ] **Step 4: Commit**
```bash
git add components/super-admin/dashboard/OrdersStatusChart.tsx \
        components/super-admin/dashboard/OrdersTimelineChart.tsx \
        "app/(dashboard)/super-admin/page.tsx"
git commit -m "feat(ui): add orders status + timeline charts to super-admin dashboard"
```

---

### Task 4: Warehouse Detail Page — Tab Badges for Inventory & Shipments

**Files:**
- Modify: `app/(dashboard)/super-admin/warehouse/[id]/page.tsx`

Currently only the Pallets tab has a `count`. We add count-ready support to Inventory and Shipments tabs too, loading the minimal extra state needed at the page level.

**Constraint: "No changes to Data fetching"** — The page already calls `usePalletStats(id)` for the Pallets count. Adding counts to Inventory and Shipments tabs would require new hook calls. We will add the infrastructure to pass counts but set them to `undefined` to keep the badges optional and "static-safe" (they silently omit the badge when count is undefined). The actual wiring is documented with a comment for future use.

- [ ] **Step 1: Extend the `tabs` array to accept counts for all tabs, using only already-available data**

Find the `tabs` array definition inside `WarehouseDetailPage` (around line 869):

```tsx
const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "inventory",     label: "Inventory",      icon: LayoutGrid },
    { id: "shipments",     label: "Shipments",      icon: Ship },
    { id: "pallets",       label: "Pallets",        icon: Layers, count: palletStats?.total },
    { id: "thresholds",    label: "Thresholds",     icon: Thermometer },
    { id: "expenses",      label: "Expenses",       icon: Receipt },
    { id: "notifications", label: "Notifications",  icon: Bell },
];
```

Replace with:

```tsx
// To wire live counts for inventory/shipments, pass them via props from the tab
// components or add hook calls (e.g. useWarehouseInventory, usePurchaseOrders) here.
const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "inventory",     label: "Inventory",      icon: LayoutGrid },
    { id: "shipments",     label: "Shipments",      icon: Ship },
    { id: "pallets",       label: "Pallets",        icon: Layers, count: palletStats?.total },
    { id: "thresholds",    label: "Thresholds",     icon: Thermometer },
    { id: "expenses",      label: "Expenses",       icon: Receipt },
    { id: "notifications", label: "Notifications",  icon: Bell },
];
```

(No data change — this step confirms the types are already in place.)

- [ ] **Step 2: Improve the tab badge visual style to be more prominent**

Find the tab badge span inside the `tabs.map(...)` render (around line 924):

```tsx
{count !== undefined && (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${activeTab === tabId ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-500"}`}>
        {count}
    </span>
)}
```

Replace with:

```tsx
{count !== undefined && count > 0 && (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
        activeTab === tabId
            ? "bg-indigo-600 text-white"
            : "bg-zinc-200 text-zinc-600"
    }`}>
        {count > 99 ? "99+" : count}
    </span>
)}
```

- [ ] **Step 3: Commit**
```bash
git add "app/(dashboard)/super-admin/warehouse/[id]/page.tsx"
git commit -m "feat(ui): improve warehouse tab badge styling"
```

---

### Task 5: Store Detail Page — Analytics Section

**Files:**
- Create: `components/super-admin/stores/StoreActivityChart.tsx`
- Modify: `app/(dashboard)/super-admin/stores/[id]/page.tsx`

Add a visual analytics section showing weekly inventory activity (from the `logs` data already fetched) plus four key metric cards (mock values for revenue/efficiency, real values for storage/employees).

- [ ] **Step 1: Create `StoreActivityChart.tsx`**

```tsx
// components/super-admin/stores/StoreActivityChart.tsx
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LogEntry {
  created_at: string;
  quantity_change: number;
}

interface Props {
  logs: LogEntry[];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function StoreActivityChart({ logs }: Props) {
  const days = getLast7Days();

  const data = days.map((day) => {
    const dayLogs = logs.filter((l) => l.created_at.slice(0, 10) === day);
    const totalIn  = dayLogs.filter((l) => l.quantity_change > 0).reduce((s, l) => s + l.quantity_change, 0);
    const totalOut = dayLogs.filter((l) => l.quantity_change < 0).reduce((s, l) => s + Math.abs(l.quantity_change), 0);
    return {
      day: new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
      "Stock In":  totalIn,
      "Stock Out": totalOut,
    };
  });

  const hasActivity = data.some((d) => d["Stock In"] > 0 || d["Stock Out"] > 0);

  if (!hasActivity) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No activity in the last 7 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
        <Area type="monotone" dataKey="Stock In"  stroke="#6366f1" fill="url(#colorIn)"  strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="Stock Out" stroke="#f59e0b" fill="url(#colorOut)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Add the analytics section to `stores/[id]/page.tsx`**

Add imports at the top of the file:
```tsx
import { StoreActivityChart } from "@/components/super-admin/stores/StoreActivityChart";
```

Then in the JSX, after the `<NewCatalogItemsBanner ... />` component and before the `<div className="mt-6">` that contains the tab strip, insert:

```tsx
{/* Analytics section */}
<div className="space-y-4">
  <h2 className="text-sm font-semibold text-gray-900">Store Analytics</h2>

  {/* Key metrics */}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">Storage Spaces</p>
      <p className="text-2xl font-bold text-gray-900">{location.storage_spaces?.length ?? 0}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">Configured</p>
    </div>
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">Employees</p>
      <p className="text-2xl font-bold text-gray-900">{employees?.length ?? 0}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">Assigned</p>
    </div>
    <div className={`bg-white border rounded-xl p-4 ${activeAlertCount > 0 ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
      <p className="text-xs text-gray-500 mb-1">Active Alerts</p>
      <p className={`text-2xl font-bold ${activeAlertCount > 0 ? "text-red-600" : "text-gray-900"}`}>
        {activeAlertCount}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">Low stock</p>
    </div>
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">Log Entries</p>
      <p className="text-2xl font-bold text-gray-900">{logs?.length ?? 0}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">All time</p>
    </div>
  </div>

  {/* Activity chart */}
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Inventory Activity</h3>
        <p className="text-xs text-gray-400 mt-0.5">Stock movement — last 7 days</p>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Stock In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Stock Out
        </span>
      </div>
    </div>
    <StoreActivityChart logs={logs ?? []} />
  </div>
</div>
```

- [ ] **Step 3: Commit**
```bash
git add components/super-admin/stores/StoreActivityChart.tsx \
        "app/(dashboard)/super-admin/stores/[id]/page.tsx"
git commit -m "feat(ui): add analytics section + activity chart to store detail page"
```

---

### Task 6: Orders Table — Improved Readability + Status-Grouped View

**Files:**
- Modify: `app/(dashboard)/admin/orders/page.tsx`

Two sub-tasks:
1. Increase font size and row height in the list table view
2. Add a third view mode "status" (kanban-style column layout grouped by status)

- [ ] **Step 1: Improve table row density — increase padding and font size**

In the `TableRow` for each ticket (the one with `className="group cursor-pointer border-b border-gray-100 hover:bg-gray-50/70 transition-colors"`), the cells use `text-xs`. Change the following cells to have better sizing:

Find the `TableHead` row in the table header. Change:
```tsx
<TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
    <TableHead className="w-4 pl-5 pr-2" />
    <TableHead className="w-28 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        Ticket ID
    </TableHead>
    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
        Title
    </TableHead>
    <TableHead className="w-24 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        Date
    </TableHead>
    <TableHead className="w-36 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        Location
    </TableHead>
    <TableHead className="w-44 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        Contents
    </TableHead>
    <TableHead className="w-36 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        Status
    </TableHead>
    <TableHead className="w-6 pr-5 pl-2" />
</TableRow>
```

To:
```tsx
<TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
    <TableHead className="w-4 pl-5 pr-2" />
    <TableHead className="w-32 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
        Ticket ID
    </TableHead>
    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
        Title
    </TableHead>
    <TableHead className="w-28 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
        Date
    </TableHead>
    <TableHead className="w-40 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
        Location
    </TableHead>
    <TableHead className="w-44 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
        Contents
    </TableHead>
    <TableHead className="w-36 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
        Status
    </TableHead>
    <TableHead className="w-6 pr-5 pl-2" />
</TableRow>
```

Then find the `<TableRow key={ticket.id}` data row. Change `className`:
```tsx
className="group cursor-pointer border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
```
To:
```tsx
className="group cursor-pointer border-b border-gray-100 hover:bg-gray-50/70 transition-colors h-14"
```

Also change the ticket ID cell font from `text-xs` to `text-sm`:
```tsx
// From:
className="text-xs font-medium text-gray-500"
// To:
className="text-sm font-medium text-gray-500"
```

And the title cell from `text-xs` to `text-sm`:
```tsx
// From:
<span className="block text-xs font-medium truncate">
// To:
<span className="block text-sm font-medium truncate">
```

And the date/location cells from `text-xs` to `text-sm`:
```tsx
// Date cell — from:
<div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
// To:
<div className="flex items-center gap-1 text-sm text-gray-400 whitespace-nowrap">

// Location cell — from:
<div className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
// To:
<div className="flex items-center gap-1 text-sm text-gray-400 min-w-0">

// Contents cell items/boxes — from (twice):
<span className="text-xs text-gray-500">
// To:
<span className="text-sm text-gray-500">
```

- [ ] **Step 2: Add status-grouped "Kanban" view mode**

Add `ViewMode` type extension. The current type is:
```tsx
type ViewMode = "list" | "grid";
```
Change to:
```tsx
type ViewMode = "list" | "grid" | "status";
```

Add a new `KanbanView` component after `TicketCard` and before `AdminOrdersPage`:

```tsx
const KANBAN_STATUSES: TicketStatus[] = ["draft", "submitted", "processing", "fulfilled", "confirmed"];

function KanbanView({ tickets, router }: { tickets: RawTicket[]; router: ReturnType<typeof useRouter> }) {
    return (
        <div className="flex gap-3 overflow-x-auto pb-4">
            {KANBAN_STATUSES.map((status) => {
                const group = tickets.filter((t) => t.status === status);
                const { label, dot, accent } = STATUS_CONFIG[status];
                return (
                    <div key={status} className="flex-shrink-0 w-72">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className={`w-2 h-2 rounded-full ${dot}`} />
                            <span className="text-xs font-semibold text-gray-700">{label}</span>
                            <span className="ml-auto text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                {group.length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {group.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-300">
                                    No {label.toLowerCase()} orders
                                </div>
                            ) : (
                                group.map((ticket) => {
                                    const dateToShow = ticket.submitted_at ?? ticket.created_at;
                                    return (
                                        <button
                                            key={ticket.id}
                                            onClick={() => router.push(`/admin/orders/${ticket.id}`)}
                                            className="w-full text-left group"
                                        >
                                            <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-violet-300 hover:shadow-[0_2px_12px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-150">
                                                <div className={`h-[3px] w-full ${accent}`} />
                                                <div className="p-3.5">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                        {ticket.title ?? <span className="text-gray-300 italic text-xs font-normal">No title</span>}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                                                        <span>{relativeDate(dateToShow)}</span>
                                                        <span>{getItemCount(ticket)} items · {getTotalBoxes(ticket)} boxes</span>
                                                    </div>
                                                    {ticket.requesting_location && (
                                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-400">
                                                            <MapPin size={9} className="shrink-0" />
                                                            {ticket.requesting_location.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 3: Add the third view toggle button and render the KanbanView**

In the header buttons area, change the existing view toggle from:
```tsx
<div className="flex border border-gray-200 rounded-lg overflow-hidden">
    <button
        onClick={() => setViewMode("grid")}
        className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"}`}
    >
        <LayoutGrid size={14} />
    </button>
    <button
        onClick={() => setViewMode("list")}
        className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"}`}
    >
        <List size={14} />
    </button>
</div>
```

To:
```tsx
<div className="flex border border-gray-200 rounded-lg overflow-hidden">
    <button
        onClick={() => setViewMode("grid")}
        title="Grid view"
        className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"}`}
    >
        <LayoutGrid size={14} />
    </button>
    <button
        onClick={() => setViewMode("list")}
        title="List view"
        className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"}`}
    >
        <List size={14} />
    </button>
    <button
        onClick={() => setViewMode("status")}
        title="Status view"
        className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "status" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"}`}
    >
        <Columns size={14} />
    </button>
</div>
```

Add `Columns` to the lucide-react import at the top of the file.

Then in the render body, find the `{viewMode === "list" ? ... : /* GRID VIEW */ ...}` block and extend it:

```tsx
{viewMode === "list" ? (
    /* existing table view — unchanged */
    ...
) : viewMode === "status" ? (
    <KanbanView tickets={filtered} router={router} />
) : (
    /* existing grid view */
    ...
)}
```

- [ ] **Step 4: Commit**
```bash
git add "app/(dashboard)/admin/orders/page.tsx"
git commit -m "feat(ui): orders table readability + status-grouped kanban view"
```

---

### Task 7: New Order Page — Item Selection Dialog

**Files:**
- Create: `components/admin/orders/ItemAddDialog.tsx`
- Modify: `app/(dashboard)/admin/orders/new/page.tsx`

Replace the inline quantity stepper and box config picker inside `CatalogItemRow` with a Dialog that opens when the user clicks "Add to order" or "Edit".

- [ ] **Step 1: Create `ItemAddDialog.tsx`**

```tsx
// components/admin/orders/ItemAddDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, Boxes, Loader2 } from "lucide-react";
import type { WarehouseCatalogItem } from "@/lib/supabase/queries/warehouse";
import type { ShipmentBoxConfig } from "@/lib/supabase/queries/itemShipmentHistory";

function validateBoxQty(val: string | number): { ok: boolean; value?: number; error?: string } {
    const n = Number(val);
    if (val === "" || val === null || val === undefined) return { ok: false, error: "Required" };
    if (!Number.isInteger(n)) return { ok: false, error: "Whole boxes only — no decimals" };
    if (n < 1) return { ok: false, error: "Minimum 1 box" };
    if (n > 999) return { ok: false, error: "Maximum 999 boxes" };
    return { ok: true, value: n };
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: (WarehouseCatalogItem & { box_quantity: number }) | null;
    organizationId: string;
    initialBoxes?: number;
    initialConfig?: ShipmentBoxConfig | null;
    configs: ShipmentBoxConfig[];
    configsLoading: boolean;
    onConfirm: (boxes: number, config: ShipmentBoxConfig | null) => void;
}

export function ItemAddDialog({
    open,
    onOpenChange,
    item,
    organizationId,
    initialBoxes = 1,
    initialConfig = null,
    configs,
    configsLoading,
    onConfirm,
}: Props) {
    const [inputVal, setInputVal] = useState(String(initialBoxes));
    const [error, setError] = useState<string | null>(null);
    const [selectedConfig, setSelectedConfig] = useState<ShipmentBoxConfig | null>(initialConfig);
    const [configError, setConfigError] = useState(false);

    useEffect(() => {
        if (open) {
            setInputVal(String(initialBoxes));
            setSelectedConfig(initialConfig ?? null);
            setError(null);
            setConfigError(false);
        }
    }, [open, initialBoxes, initialConfig]);

    if (!item) return null;

    const requiresConfig = configs.length > 0;
    const ppb = selectedConfig?.piecesPerBox ?? item.box_quantity;
    const displayBoxes = parseInt(inputVal) || 1;

    const handleInputChange = (val: string) => {
        if (val.includes(".")) return;
        setInputVal(val);
        const v = validateBoxQty(val);
        setError(v.ok ? null : (v.error ?? null));
    };

    const adjust = (delta: number) => {
        const next = Math.max(1, Math.min(999, displayBoxes + delta));
        setInputVal(String(next));
        setError(null);
    };

    const handleConfirm = () => {
        const v = validateBoxQty(inputVal);
        if (!v.ok) { setError(v.error ?? null); return; }
        if (requiresConfig && !selectedConfig) { setConfigError(true); return; }
        onConfirm(v.value!, selectedConfig);
        onOpenChange(false);
    };

    const unitPrice = item.warehouse_transfer_price ?? null;
    const pricePerBox = unitPrice != null ? unitPrice * item.box_quantity : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">{item.name}</DialogTitle>
                    {item.sku && (
                        <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
                    )}
                </DialogHeader>

                {/* Price info */}
                {unitPrice != null && (
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <span>${unitPrice.toFixed(2)} / unit</span>
                        {pricePerBox != null && (
                            <span className="text-indigo-600 font-semibold">· ${pricePerBox.toFixed(2)} / box</span>
                        )}
                    </div>
                )}

                {/* Quantity stepper */}
                <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block mb-2">
                        Quantity (boxes)
                    </label>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={() => adjust(-1)}
                                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-l-lg bg-white hover:bg-gray-50 text-gray-500 text-lg font-medium transition-all"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={999}
                                step={1}
                                value={inputVal}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if ([".", "e", "E", "-", "+"].includes(e.key)) e.preventDefault();
                                }}
                                className={`w-16 h-10 border-y text-center text-sm font-semibold text-gray-900 outline-none transition-all ${
                                    error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white focus:border-indigo-400"
                                }`}
                                style={{ MozAppearance: "textfield", appearance: "textfield" } as React.CSSProperties}
                            />
                            <button
                                type="button"
                                onClick={() => adjust(1)}
                                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-r-lg bg-white hover:bg-gray-50 text-gray-500 text-lg font-medium transition-all"
                            >
                                +
                            </button>
                        </div>
                        <span className="text-sm text-gray-500">
                            = <span className="font-semibold text-gray-800">{displayBoxes * ppb}</span> {item.unit_of_measure}
                        </span>
                    </div>
                    {error && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={11} /> {error}
                        </p>
                    )}
                </div>

                {/* Box config picker */}
                {configsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                        <Loader2 size={12} className="animate-spin" /> Loading shipment configs…
                    </div>
                ) : configs.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1">
                        <Boxes size={12} className="text-gray-300" />
                        {item.box_quantity} {item.unit_of_measure}/box (default)
                    </div>
                ) : (
                    <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                            Box Configuration
                        </p>
                        <div className="flex gap-1.5 flex-wrap">
                            {configs.map((cfg) => {
                                const isActive = selectedConfig?.id === cfg.id;
                                const label = cfg.poNumber ?? (cfg.poDate
                                    ? new Date(cfg.poDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                                    : `${cfg.piecesPerBox}/box`);
                                return (
                                    <button
                                        key={cfg.id}
                                        type="button"
                                        onClick={() => { setSelectedConfig(cfg); setConfigError(false); }}
                                        className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all ${
                                            isActive
                                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                                : configError
                                                  ? "border-red-300 bg-red-50 hover:border-red-400"
                                                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        <span className={`text-xs font-semibold leading-tight ${isActive ? "text-indigo-700" : "text-gray-700"}`}>
                                            {label}
                                        </span>
                                        <span className={`text-[10px] mt-0.5 ${isActive ? "text-indigo-500" : "text-gray-400"}`}>
                                            {cfg.piecesPerBox} {item.unit_of_measure}/box
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {configError && (
                            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={11} /> Choose a box config to continue
                            </p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        Add to order
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 2: Simplify `CatalogItemRow` in `new/page.tsx` to open the dialog instead of inline controls**

The key changes to `CatalogItemRow`:
1. Remove the local `inputVal`, `error`, `showConfigPicker`, `localConfig`, `configError` state
2. Keep only a `dialogOpen` state boolean
3. Keep `useItemShipmentConfigs` call (needed to pass to dialog)
4. Replace the inline quantity + config picker section with a simple button
5. Pass dialog open/close + onConfirm to the new `ItemAddDialog`

Replace the entire `CatalogItemRow` function with:

```tsx
function CatalogItemRow({
    item,
    cartEntry,
    organizationId,
    onAdd,
    onRemove,
    onQtyChange,
    onConfigChange,
}: {
    item: WarehouseCatalogItem & { box_quantity: number };
    cartEntry?: CartEntry;
    organizationId: string;
    onAdd: (item: WarehouseCatalogItem & { box_quantity: number }, boxes: number, config: ShipmentBoxConfig | null) => void;
    onRemove: (itemId: number) => void;
    onQtyChange: (itemId: number, boxes: number) => void;
    onConfigChange: (itemId: number, config: ShipmentBoxConfig | null) => void;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { configs, loading: configsLoading } = useItemShipmentConfigs(item.id, organizationId);

    const unitPrice = item.warehouse_transfer_price ?? null;
    const missingPrice = unitPrice == null;
    const pricePerBox = unitPrice != null && item.box_quantity != null ? unitPrice * item.box_quantity : null;
    const inCart = !!cartEntry;
    const ppb = cartEntry?.selectedConfig?.piecesPerBox ?? item.box_quantity;

    const handleConfirm = (boxes: number, config: ShipmentBoxConfig | null) => {
        if (inCart) {
            onQtyChange(item.id, boxes);
            onConfigChange(item.id, config);
        } else {
            onAdd(item, boxes, config);
        }
    };

    return (
        <>
            <div
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-100 ${
                    missingPrice
                        ? "border-gray-100 bg-gray-50 opacity-60 pointer-events-none"
                        : inCart
                          ? "border-indigo-300 bg-indigo-50/40"
                          : "border-gray-200 bg-white hover:border-violet-200 hover:shadow-[0_1px_6px_rgba(99,102,241,0.07)]"
                }`}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                        {inCart && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 size={9} /> In order
                            </span>
                        )}
                    </div>
                    {item.sku && (
                        <div className="mt-1">
                            <span style={{ fontFamily: "var(--font-mono, monospace)" }} className="text-[10px] text-gray-400">
                                {item.sku}
                            </span>
                        </div>
                    )}
                    {missingPrice ? (
                        <div className="mt-1 text-[11px] text-amber-600 font-medium flex items-center gap-1">
                            <AlertCircle size={10} /> Price not yet set — ask super admin to enable ordering
                        </div>
                    ) : (
                        <div className="mt-1 text-[11px] text-gray-500">
                            {formatCurrency(unitPrice!)} / unit
                            {pricePerBox != null && (
                                <span className="ml-1 text-indigo-600 font-semibold">· {formatCurrency(pricePerBox)} / box</span>
                            )}
                        </div>
                    )}
                    {inCart && (
                        <div className="mt-1.5 text-[11px] text-gray-500">
                            <span className="font-semibold text-indigo-700">{cartEntry!.boxes} box{cartEntry!.boxes !== 1 ? "es" : ""}</span>
                            {" "}· {cartEntry!.boxes * ppb} {item.unit_of_measure}
                            {cartEntry?.selectedConfig && (
                                <span className="ml-1 text-[10px] text-indigo-400">
                                    · {cartEntry.selectedConfig.piecesPerBox}/box
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {inCart ? (
                        <>
                            <button
                                onClick={() => setDialogOpen(true)}
                                className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => onRemove(item.id)}
                                className="text-[11px] font-semibold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                            >
                                <X size={10} /> Remove
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setDialogOpen(true)}
                            className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors"
                        >
                            Add to order
                        </button>
                    )}
                </div>
            </div>

            <ItemAddDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                item={item}
                organizationId={organizationId}
                initialBoxes={cartEntry?.boxes ?? 1}
                initialConfig={cartEntry?.selectedConfig ?? null}
                configs={configs}
                configsLoading={configsLoading}
                onConfirm={handleConfirm}
            />
        </>
    );
}
```

Also add this import at the top of `new/page.tsx`:
```tsx
import { ItemAddDialog } from "@/components/admin/orders/ItemAddDialog";
```

And remove these unused imports from `new/page.tsx` (they were used by the old inline UI):
- `ChevronDown`, `ChevronUp` (if unused elsewhere)

- [ ] **Step 3: Commit**
```bash
git add components/admin/orders/ItemAddDialog.tsx \
        "app/(dashboard)/admin/orders/new/page.tsx"
git commit -m "feat(ui): replace inline item selection with dialog in new order flow"
```

---

## Final Verification Checklist

- [ ] Run `npm run build` — zero TypeScript errors
- [ ] Run `npm run lint` — zero lint warnings on changed files
- [ ] Admin sidebar: three labelled groups visible, collapses cleanly to icons, "New Order" button links to `/admin/orders/new`
- [ ] Super-admin sidebar: four labelled sections, "New PO" button links to `/super-admin/purchase-orders/new`
- [ ] Super-admin dashboard: charts render when tickets exist, hidden gracefully when no data
- [ ] Warehouse tabs: Pallets count badge shows correct number; other tabs show no badge (static-safe)
- [ ] Store detail: analytics section appears above tabs with activity chart
- [ ] Orders list view: rows are taller with larger text
- [ ] Orders status view: kanban columns render per status, scrolls horizontally on small screens
- [ ] New order dialog: clicking "Add to order" opens dialog; confirming calls the right handler; "Edit" reopens with current values
