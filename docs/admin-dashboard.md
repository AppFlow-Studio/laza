# Admin Dashboard

The admin dashboard is accessible at `/admin` and provides full management of inventory, items, locations, users, and notifications. It uses a persistent collapsible sidebar for navigation.

## Navigation

| Route | Label |
|-------|-------|
| `/admin` | Dashboard |
| `/admin/locations` | Locations |
| `/admin/users` | Team Members |
| `/admin/items` | Items |
| `/admin/categories` | Categories |
| `/admin/inventory` | Inventory |
| `/admin/settings/notifications` | Settings |

Footer links: Homepage (`/`), Sign Out.

---

## Dashboard Home (`/admin`)

Executive overview of the entire system.

**Stats Grid (4 cards):**
- Total Locations
- Employees count
- Items count
- Low Stock Alerts (highlighted red if alerts exist)

**Sections:**
- Immediate Actions — Quick action buttons for common tasks
- Activity Feed — Recent system activity and changes

**Hooks**: `useLocations`, `useItems`, `useAlerts`, `useOrganizationUsers`, `useUserInfo`

---

## Locations (`/admin/locations`)

Manage cafe locations across the chain.

**Features:**
- Grid/List view toggle
- Search by name or address
- Add, edit, delete locations
- Location cards showing name and formatted address

**Hooks**: `useLocations`, `useDeleteLocation`, `useDebounce`

### Location Detail (`/admin/locations/[id]`)

Deep dive into a specific location.

**Left Panel — Storage Spaces:**
- List all storage spaces with temperature type badges (frozen, refrigerated, dry)
- Add new storage space via StorageSetupWizard (2-step: create space, assign items)
- Click through to storage space detail

**Right Panel — Employees:**
- Search employees by name/email
- Shows assigned employees with initials, name, email

**Update Limits Manager:**
- Configure max inventory updates per time window
- Set per-location or per-storage-space limits

**Hooks**: `useLocationWithDetails`, `useEmployeesByLocation`, `useDebounce`

### Storage Space Detail (`/admin/locations/[id]/storage-spaces/[storage-id]`)

Manage inventory within a specific storage space.

**Header**: Name, temperature type badge, edit/delete actions.

**Items Tab:**
- Grid/List view of items in this storage space
- Search and filter by category
- Add items to storage space (bulk assign)
- Each item shows: name, SKU, category, current quantity, unit, min quantity, low stock warning
- Selection checkboxes with "Select All"
- Bulk actions: update quantity, update min override, bulk update all, remove from storage
- Individual item edit modal

**Inventory Logs Tab:**
- Complete audit trail of inventory changes
- Shows who made changes and timestamps

**Hooks**: `useStorageSpace`, `useInventoryByStorageSpace`, `useInventoryLogsByStorageSpace`, `useUpdateStorageSpace`, `useDeleteStorageSpace`, `useBulkAssignItems`, `useBulkUpdateInventory`, `useBulkRemoveItems`, `useCategories`

---

## Items (`/admin/items`)

Manage the item catalog (organization-wide, not location-specific).

**Features:**
- Grid/List view toggle
- Search by name or SKU
- Filter by category
- Add, edit, delete items

**Item Fields**: name, SKU, category, unit of measure, min quantity.

**Bulk Operations** (select multiple items):
- Update min quantity
- Update category
- Update unit of measure
- Update all fields at once
- Bulk delete with confirmation

**Hooks**: `useItems`, `useSearchItems`, `useCategories`, `useDeleteItem`, `useBulkUpdateItems`, `useBulkDeleteItems`, `useDebounce`

---

## Categories (`/admin/categories`)

Organize items into categories.

**Features:**
- Search by name or description
- Create, edit, delete categories
- Delete protection: warning if category has items, shows affected count

**Hooks**: `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, `useDebounce`, `useUserInfo`

---

## Inventory (`/admin/inventory`)

Matrix view of inventory across storage spaces for a selected location.

**Features:**
- Location selector dropdown (persisted via `adminStore`)
- Matrix layout: rows = items, columns = storage spaces
- Cell values: current quantity for item in storage space
- Click a cell to update quantity
- Quantity Update Modal: update quantity, set min override

**Hooks**: `useLocations`, `useInventoryByLocation`, `useItems`, `useLocationWithDetails`, `useAdminStore`

---

## Users (`/admin/users`)

Manage team members, roles, and invitations.

**Stats Dashboard (3 cards):** Active Users, Admins, Employees.

**User Table:**
- Search by name or email
- Filter by role (Admin/Employee) and status (Active/Inactive)
- Edit user: change role, location assignment, active status

**Pending Invitations:**
- Shows pending invites with count badge
- Cancel or resend invitations

**Invite New User:**
- Set email, role (admin/employee), and location assignment
- Creates Clerk invitation + `org_invites` record

**Hooks**: `useOrganizationUsers`, `usePendingInvitations`, `useUserInfo`, `useDebounce`

---

## Settings — Notifications (`/admin/settings/notifications`)

5-tab notification configuration.

| Tab | Purpose |
|-----|---------|
| General | Toggle notifications on/off |
| Low Stock | Enable/disable low stock alerts, configure recipients |
| Thresholds | Set min quantity thresholds per item, category, or location |
| Daily Summary | Enable/disable daily summary, set recipients, schedule, and content |
| Logs | View email delivery history, filter by date range |

**Components**: `GeneralNotificationPreferences`, `LowStockAlertPreferences`, `LowStockThresholdManager`, `DailySummaryPreferences`, `EmailDeliveryLogs`

---

## Shared UI Patterns

- **Search + Filter**: Every list page has search with debounce and filter dropdowns
- **Grid/List toggle**: Items, Locations, Storage Space items support view switching
- **Bulk operations**: Select items with checkboxes, "Select All", bulk action toolbar
- **Confirmation dialogs**: AlertDialog for destructive actions
- **MobileSheet**: Bottom sheet modals for forms on mobile
- **Loading skeletons**: CardSkeleton/LoadingSkeleton during data fetching
- **Toast notifications**: react-hot-toast for user feedback
- **Breadcrumb navigation**: On detail pages (Location > Storage Space)
- **Framer Motion**: Animated transitions on stats cards and list items
