# API Reference

All data operations follow the pattern: **Supabase query functions** -> **React Query hooks** -> **Components**. This reference lists every function and hook organized by domain.

---

## Inventory

### Query Functions (`lib/supabase/queries/inventory.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getInventoryByLocation` | `locationId` | Fetch all items at a location with item and storage space details |
| `getInventoryByItemAndLocation` | `itemId, locationId` | Get single item-location record |
| `updateQuantity` | `{itemId, locationId, storageSpaceId, quantity, userId, actionType, notes, isOverride?}` | Update item quantity with logging and limit checks |
| `getInventoryLogs` | `filters?, organizationId?` | Get inventory logs with optional itemId, locationId, limit filters |
| `getAlerts` | `filters?, organizationId?` | Get low stock alerts filtered by location, storage space, resolved status |
| `getLowStockItems` | `groupBy` | Get low stock items grouped by location or item |
| `resolveAlert` | `alertId` | Mark an alert as resolved |
| `bulkAssignItemsToStorage` | `locationId, storageSpaceId, items[], userId, organizationId` | Bulk upsert items to storage with log creation |
| `bulkUpdateInventory` | `itemLocations[], userId, isOverride?, organizationId?` | Bulk update multiple items with limit checking |
| `bulkRemoveItemsFromStorage` | `itemIds[], locationId, storageSpaceId` | Delete items from a storage space |
| `getInventoryByStorageSpace` | `storageSpaceId` | Get all items in a storage space |
| `getInventoryLogsByStorageSpace` | `storageSpaceId, limit?` | Get activity logs for a storage space |

### React Query Hooks (`lib/hooks/queries/useInventory.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useInventoryByLocation(locationId)` | Query | Inventory for a location |
| `useInventoryLogs(filters?)` | Query | Inventory logs with org filtering |
| `useAlerts(filters?)` | Query | Low stock alerts |
| `useLowStockItems(groupBy)` | Query | Low stock items (30s stale time) |
| `useUpdateQuantity()` | Mutation | Update quantity; invalidates inventory, logs, alerts |
| `useResolveAlert()` | Mutation | Resolve an alert |
| `useBulkUpdateInventory()` | Mutation | Bulk update with org context |
| `useBulkRemoveItems()` | Mutation | Bulk remove items from storage |

---

## Items

### Query Functions (`lib/supabase/queries/items.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getAllItems` | `organizationId` | Get all items with categories |
| `getItemById` | `id` | Get single item |
| `getItemsByCategory` | `categoryId` | Get items filtered by category |
| `searchItems` | `query` | Full-text search on name or SKU |
| `createItem` | `item` | Create new item |
| `updateItem` | `id, updates` | Update item data |
| `deleteItem` | `id` | Delete item |
| `bulkUpdateItems` | `itemIds[], updates` | Bulk update (min_quantity, category_id, unit_of_measure) |
| `bulkDeleteItems` | `itemIds[]` | Bulk delete items |

### React Query Hooks (`lib/hooks/queries/useItems.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useItems()` | Query | All items with org filtering |
| `useItem(id)` | Query | Single item |
| `useItemsByCategory(category)` | Query | Items by category |
| `useSearchItems(query)` | Query | Search results (enabled when query length > 0) |
| `useCreateItem()` | Mutation | Create item |
| `useUpdateItem()` | Mutation | Update item |
| `useDeleteItem()` | Mutation | Delete item |
| `useBulkUpdateItems()` | Mutation | Bulk update |
| `useBulkDeleteItems()` | Mutation | Bulk delete |

---

## Locations

### Query Functions (`lib/supabase/queries/locations.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getAllLocations` | `organizationId` | Get all locations with storage spaces and employees |
| `getLocationById` | `id` | Get location with basic data |
| `getLocationWithDetails` | `id` | Get location with storage spaces and employee count |
| `createLocation` | `location` | Create new location with address object |
| `updateLocation` | `id, updates` | Update location |
| `deleteLocation` | `id` | Delete location |
| `getStorageSpacesByLocation` | `locationId` | Get all storage spaces at a location |
| `createStorageSpace` | `storageSpace` | Create storage space |
| `updateStorageSpace` | `id, updates` | Update storage space |
| `deleteStorageSpace` | `id` | Delete storage space |
| `getStorageSpaceById` | `id` | Get storage space with location info |

### React Query Hooks (`lib/hooks/queries/useLocations.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useLocations()` | Query | All locations with org filtering |
| `useLocation(id)` | Query | Single location |
| `useLocationWithDetails(id)` | Query | Location with full details |
| `useCreateLocation()` | Mutation | Create location |
| `useUpdateLocation()` | Mutation | Update location |
| `useDeleteLocation()` | Mutation | Delete location |

### Storage Setup Hooks (`lib/hooks/queries/useStorageSetup.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useCreateStorageSpace()` | Mutation | Create storage space |
| `useBulkAssignItems()` | Mutation | Assign items to storage in bulk |

### Storage Space Hooks (`lib/hooks/queries/useStorageSpace.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useStorageSpace(id)` | Query | Storage space by ID |
| `useInventoryByStorageSpace(storageSpaceId)` | Query | Items in storage space |
| `useInventoryLogsByStorageSpace(storageSpaceId, limit?)` | Query | Storage space activity |
| `useUpdateStorageSpace()` | Mutation | Update storage space |
| `useDeleteStorageSpace()` | Mutation | Delete storage space |

---

## Categories

### Query Functions (`lib/supabase/queries/categories.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getAllCategories` | `organizationId` | Get all categories with item counts |
| `getCategoryById` | `id` | Get single category |
| `createCategory` | `name, organizationId, description?` | Create category |
| `updateCategory` | `id, updates` | Update category |
| `deleteCategory` | `id` | Delete category |

### React Query Hooks (`lib/hooks/queries/useCategories.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useCategories()` | Query | All categories with org filtering |
| `useCategory(id)` | Query | Single category |
| `useCreateCategory()` | Mutation | Create category |
| `useUpdateCategory()` | Mutation | Update category |
| `useDeleteCategory()` | Mutation | Delete category (also invalidates items) |

---

## Employees (Admin View)

### Query Functions (`lib/supabase/queries/employees.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getAllEmployees` | `organizationId` | Get all employees via members join |
| `getEmployeeById` | `id` | Get single employee |
| `getEmployeesByLocation` | `locationId` | Get active employees at a location |
| `updateEmployee` | `id, updates` | Update employee data |
| `assignEmployeeToLocation` | `employeeId, locationId` | Assign employee to location |
| `bulkAssignEmployees` | `employeeIds[], locationId` | Bulk assign employees |
| `activateEmployee` | `id, isActive` | Toggle active status |

### React Query Hooks (`lib/hooks/queries/useEmployees.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useEmployees()` | Query | All employees with org filtering |
| `useEmployee(id)` | Query | Single employee |
| `useEmployeesByLocation(locationId)` | Query | Employees at a location |
| `useUpdateEmployee()` | Mutation | Update employee |
| `useAssignEmployee()` | Mutation | Assign to location |
| `useBulkAssignEmployees()` | Mutation | Bulk assign |
| `useActivateEmployee()` | Mutation | Activate/deactivate |

---

## Employee Self-Service

### Query Functions (`lib/supabase/queries/employee.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getEmployeeLocation` | `userId` | Get employee's assigned location |
| `getEmployeeStorageSpaces` | `locationId` | Get storage spaces visible to employee |
| `getStorageSpaceById` | `storageSpaceId` | Get storage space details (employee view) |
| `getStorageSpaceItems` | `storageSpaceId` | Get items in storage space (sorted by name) |
| `getEmployeeInventoryLogs` | `locationId, limit?` | Get activity logs for location |
| `getStorageSpaceLogs` | `storageSpaceId, limit?` | Get activity logs for storage space |
| `getEmployeeStats` | `userId, locationId` | Get stats (total updates, weekly, items managed, last activity) |

### React Query Hooks (`lib/hooks/queries/useEmployee.ts`)

| Hook | Type | Stale Time | Description |
|------|------|------------|-------------|
| `useEmployeeLocation()` | Query | 5 min | Employee's assigned location |
| `useEmployeeStorageSpaces(locationId)` | Query | 30s | Storage spaces in location |
| `useStorageSpace(storageSpaceId)` | Query | 5 min | Storage space details |
| `useStorageSpaceItems(storageSpaceId)` | Query | 30s | Items in storage space |
| `useEmployeeInventoryLogs(locationId, limit?)` | Query | 30s | Location activity logs |
| `useStorageSpaceLogs(storageSpaceId, limit?)` | Query | 30s | Storage space activity |
| `useEmployeeStats(userId, locationId)` | Query | 1 min | Employee performance stats |
| `useUpdateQuantity()` | Mutation | — | Update quantity with employee-specific invalidation |

---

## Users & Organization

### Query Functions (`lib/supabase/queries/users.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getOrganizationUsers` | `organizationId` | Get all org users with location info |
| `getPendingInvitations` | `organizationId` | Get pending org invitations |

### Query Functions (`lib/supabase/queries/user.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getUserById` | `id` | Get user with members and org data |

### Mutation Functions (`lib/supabase/mutations/users.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `createInvitation` | `input` | Create org invitation (Clerk + DB), validates employee location |
| `updateUser` | `input` | Update role, location, active status |
| `cancelInvitation` | `clerkInviteId` | Revoke Clerk invitation |
| `resendInvitation` | `invitationId` | Revoke and recreate invitation |

### React Query Hooks (`lib/hooks/queries/useUsers.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useOrganizationUsers(organizationId)` | Query | All org users |
| `usePendingInvitations(organizationId)` | Query | Pending invitations |
| `useCreateInvitation()` | Mutation | Create invitation |
| `useUpdateUser()` | Mutation | Update user |
| `useCancelInvitation()` | Mutation | Cancel invitation |
| `useResendInvitation()` | Mutation | Resend invitation |

### User Info Hook (`lib/hooks/queries/useUserInfo.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useUserInfo()` | Query | Current logged-in user info (from Clerk) |

---

## Update Limits

### Query Functions (`lib/supabase/queries/updateLimits.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getUpdateLimit` | `locationId, storageSpaceId` | Get limit (storage-specific or location-wide default) |
| `getUpdateLimitsByLocation` | `locationId` | Get all limits for a location |
| `createUpdateLimit` | `input` | Create rate limit window |
| `updateUpdateLimit` | `id, updates` | Update limit settings |
| `deleteUpdateLimit` | `id` | Delete limit |
| `checkUpdateAllowed` | `itemId, locationId, storageSpaceId, userId` | Check if update allowed (RPC). Admins always allowed |
| `createOverrideLog` | `data` | Log admin override |

### React Query Hooks (`lib/hooks/queries/useUpdateLimits.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useUpdateLimit(locationId, storageSpaceId)` | Query | Update limit config |
| `useUpdateLimitsByLocation(locationId)` | Query | All limits for a location |
| `useCreateUpdateLimit()` | Mutation | Create limit |
| `useUpdateUpdateLimit()` | Mutation | Update limit |
| `useDeleteUpdateLimit()` | Mutation | Delete limit |
| `useCheckUpdateAllowed(itemId, locationId, storageSpaceId, userId)` | Query | Check if allowed (10s stale) |
| `useCreateOverrideLog()` | Mutation | Log override |

---

## Notification Preferences

### Query Functions (`lib/supabase/queries/notificationPreferences.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `getNotificationPreferences` | `organizationId` | Get org notification settings |
| `createNotificationPreferences` | `organizationId, data` | Create with defaults |
| `updateNotificationPreferences` | `organizationId, updates` | Update settings |
| `getLowStockThresholds` | `organizationId, filters?` | Get thresholds by item/category/location |
| `createLowStockThreshold` | `data` | Create threshold |
| `updateLowStockThreshold` | `id, updates` | Update threshold |
| `deleteLowStockThreshold` | `id` | Delete threshold |
| `getDailySummaryPreferences` | `organizationId` | Get daily summary settings |
| `updateDailySummaryPreferences` | `organizationId, updates` | Update or create summary prefs |

### React Query Hooks (`lib/hooks/queries/useNotificationPreferences.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useNotificationPreferences(organizationId)` | Query | Notification prefs |
| `useUpdateNotificationPreferences()` | Mutation | Update prefs |
| `useCreateNotificationPreferences()` | Mutation | Create prefs |
| `useLowStockThresholds(organizationId, filters?)` | Query | Thresholds |
| `useCreateLowStockThreshold()` | Mutation | Create threshold |
| `useUpdateLowStockThreshold()` | Mutation | Update threshold |
| `useDeleteLowStockThreshold()` | Mutation | Delete threshold |
| `useDailySummaryPreferences(organizationId)` | Query | Summary prefs |
| `useUpdateDailySummaryPreferences()` | Mutation | Update summary prefs |

---

## Email Delivery

### Query Functions (`lib/supabase/queries/emailDelivery.ts`)

| Function | Parameters | Description |
|----------|-----------|-------------|
| `logEmailDelivery` | `data` | Log email send attempt |
| `getEmailDeliveryLogs` | `organizationId, filters?` | Get logs with type/status/date/recipient filters |
| `updateEmailDeliveryStatus` | `id, status, error?, resendEmailId?` | Update delivery status |
| `getFailedEmails` | `organizationId, limit?` | Get failed emails for retry |

### React Query Hooks (`lib/hooks/queries/useEmailDelivery.ts`)

| Hook | Type | Description |
|------|------|-------------|
| `useEmailDeliveryLogs(organizationId, filters?)` | Query | Email delivery logs |

---

## Subscriptions (`lib/supabase/subscriptions.ts`)

Currently all subscription code is **commented out**. Planned hooks:

| Hook | Purpose |
|------|---------|
| `useInventorySubscription(locationId)` | Listen to `item_locations` changes |
| `useInventoryLogsSubscription()` | Listen to `inventory_logs` inserts |
| `useAlertsSubscription()` | Listen to new low stock alerts |
| `useEmployeesSubscription()` | Listen to user table changes |
