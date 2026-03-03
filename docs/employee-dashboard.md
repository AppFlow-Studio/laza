# Employee Dashboard

The employee dashboard is accessible at `/employee` and provides a mobile-first interface for employees to manage inventory at their assigned location. Navigation uses a fixed bottom bar.

## Layout

**Auth checks** (in layout):
- Redirects to sign-in if not authenticated
- Displays deactivation screen if user is inactive
- Shows error if no location is assigned

**Bottom Navigation:**

| Route | Icon | Label |
|-------|------|-------|
| `/employee` | Home | Home |
| `/employee/activity` | Clock | Activity |
| `/employee/profile` | User | Profile |

Active route indicated by indigo color with animated dot. Glass morphism backdrop with safe area padding for notched devices.

---

## Home (`/employee`)

Landing page showing location overview and storage spaces.

**Location Header**: Location name with formatted address.

**Quick Stats** (horizontally scrollable cards):
- Storage Spaces count
- Items Managed count

**Storage Spaces Grid** (2-column layout):
- Cards for each storage space at the assigned location
- Temperature type badge with icon (frozen, refrigerated, dry)
- Click to navigate to storage space detail

**Hooks**: `useEmployeeLocation`, `useEmployeeStorageSpaces`, `useEmployeeStats`

---

## Activity (`/employee/activity`)

Inventory update history with date filtering.

**Date Filter Chips**: Today, This Week, This Month, All Time.

**Logs** (grouped by date — Today, Yesterday, or formatted date):
- Item name
- Storage space location
- Action type badge (Received, Used, Adjustment, Count)
- Quantity change (+/-)
- Quantity range (before -> after)
- User who made the change
- Relative time since update
- Optional notes

Empty state with icon when no activity.

**Hooks**: `useEmployeeInventoryLogs` (max 100 entries)

---

## Profile (`/employee/profile`)

Personal information and performance stats.

**Profile Card**: Avatar (user initial), full name, employee role badge.

**Your Location Card**: Location name, full address, button to navigate to dashboard.

**Activity Stats** (2-column grid):
- Total Updates (indigo)
- This Week (purple)
- Items Managed (green)
- Storage Spaces (blue)

**Footer**: Last Activity timestamp, Sign Out button.

**Hooks**: `useEmployeeLocation`, `useEmployeeStats`, Clerk `useUser`

---

## Storage Space Detail (`/employee/storage-spaces/[id]`)

Manage inventory for a specific storage space. This is the primary workflow for employees.

**Header**: Back button, storage space name.

**Search & Filter**: Search by item name or SKU, category filter dropdown.

**Items List**:
- Item name and SKU
- Min quantity indicator
- Current quantity badge (color-coded: zero/low/normal)
- Low stock indicator (red border if below min)

**Quantity Update Modal** (opens on item tap):
- Update limit status display
- Minus/Plus buttons for adjustment
- Clickable quantity display that opens numeric keypad
- Live quantity change preview (+/- amount)
- Reason dropdown: Correction, Damaged, Expired, Found, Other
- Action Type dropdown: Count, Adjustment, Received, Used
- Summary card showing final quantity
- Cancel/Save buttons
- Toast notification on success

**Hooks**: `useStorageSpace`, `useStorageSpaceItems`, `useUpdateQuantity`, `useCheckUpdateAllowed`

**Key Components**: `QuantityUpdateSheet`, `NumericKeypad`, `SearchBar`, `FilterDropdown`

---

## Design Patterns

- **Mobile-first**: 2-column grids, bottom navigation, sheet modals
- **Color-coded quantities**: Red for zero/low stock, green for normal
- **Temperature badges**: Visual indicators for storage type
- **Animated transitions**: Framer Motion for list items and page transitions
- **Toast feedback**: Notifications on quantity update success/failure
- **Loading skeletons**: Skeleton cards during data fetching
- **Empty states**: Informative messages when no data is available
