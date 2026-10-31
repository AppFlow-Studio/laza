# Incoming Item Assignment — Design Spec
_Date: 2026-04-14_

## Overview

When a store admin confirms receipt of an order, they must designate which storage space each item goes into (e.g. Dry, Fridge, Freezer). This ensures inventory is tracked at the storage-space level from the moment goods arrive, not just at the location level.

---

## User Flow

1. Admin opens an order in `delivered` status and clicks **Confirm Receipt**.
2. The `ConfirmReceiptModal` opens — it now has two sections:
   - **Storage space tabs** at the top: pill buttons for each storage space in the location (fetched via `useLocationWithDetails`).
   - **Item list** below: same as today (item name + actual-boxes-received input), but each row also shows an assignment badge.
3. Admin selects a storage space tab (e.g. "Fridge") — it becomes the active space.
4. Admin clicks an item row to assign it to the active space. A colored badge appears on the item.
5. Admin switches tabs and assigns remaining items to other spaces.
6. Clicking an already-assigned item under its current active tab unassigns it.
7. The **Confirm** button is disabled until all items have a storage space assigned.
8. On submit, each `ReceivedItem` carries the selected `storageSpaceId`.

---

## Data Model Changes

### `ReceivedItem` interface (orderTickets.ts)
```ts
export interface ReceivedItem {
  itemId: number;
  actualBoxesReceived: number;
  storageSpaceId: string;  // NEW — required
}
```

### `confirmTicket` function (orderTickets.ts)
The `item_locations` upsert changes from `(item_id, location_id)` to `(item_id, location_id, storage_space_id)` — this is already how the rest of the inventory system works. The `inventory_logs` insert also gets `storage_space_id`.

---

## Component Changes

### `ConfirmReceiptModal` (admin/orders/[id]/page.tsx)
- Fetch storage spaces: `useLocationWithDetails(ticket.requesting_location_id)` → `.storage_spaces`
- New state: `activeSpaceId: string | null` (the selected tab), `itemAssignments: Record<string, string>` (itemId → storageSpaceId)
- Storage space tabs: pill buttons styled like existing filter chips, indigo when active
- Item rows: clicking anywhere except the quantity input toggles assignment to active space; badge shows assigned space name with temperature-type color (blue=frozen, sky=refrigerated, amber=dry)
- Confirm button: disabled + tooltip if any item has no assignment

### `useConfirmTicket` hook (useOrderTickets.ts)
- No interface change needed — `ReceivedItem` type flows through unchanged once updated.

### `confirmTicket` query (orderTickets.ts)
- `item_locations` upsert now includes `storage_space_id` per item
- `inventory_logs` insert includes `storage_space_id` per item
- Conflict key: `item_id,location_id,storage_space_id` (already the correct constraint)

---

## Styling Conventions
- Storage space tabs: same pill style as `FilterDropdown` chips — `rounded-full px-3 py-1 text-xs font-semibold`, indigo active state
- Assignment badges: temperature-type colors matching storage space cards in `[id]/page.tsx` (blue/sky/amber)
- Disabled confirm button: `opacity-50 cursor-not-allowed` with a small warning note below

---

## Constraints
- Each item goes to exactly one storage space (no splitting)
- All items must be assigned before confirming (no partial confirms)
- If a location has no storage spaces, confirmation falls back to the current behavior (no storage space selector shown)
- The `requesting_location_id` on the ticket is used to fetch that location's storage spaces
