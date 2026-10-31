# Track B — Inventory Adjustment Email Design

**Date:** 2026-05-08  
**Author:** Munis dev  
**Status:** Approved

---

## Scope

B1: Server action + email template that notifies store admin(s) when an employee submits an inventory adjustment request.  
B2: Verification only — confirm price-lock happens server-side, not at page load.

---

## B2 — Verified, No Code Change

`CreateTicketInput.items` has no `unit_price` field. `createTicket()` snapshots price server-side from `item_warehouse_pricing` before inserting `order_ticket_items`. The DB trigger `trg_snapshot_transfer_prices_on_submit` covers the draft→submitted UPDATE path. Client never supplies a price. **B2 passes.**

---

## B1 — Architecture

### 1. `createInventoryUpdateRequest` return type change

**File:** `lib/supabase/queries/inventoryUpdateRequests.ts`

Change return from `void` to `{ id: string }` by selecting the inserted row's `id`. The frontend (A6, Sardor) needs the ID to pass to the email action.

### 2. New service file

**File:** `lib/services/inventoryAdjustmentNotification.ts`

Exports one function:

```ts
export async function sendInventoryAdjustmentNotification(requestId: string): Promise<void>
```

**Data fetch:** joins `inventory_update_requests` with `items (name, unit_of_measure)`, `storage_spaces (name)`, `locations (name)`, `users (first_name, last_name)`.

**Recipient resolution:** `getRecipients(orgId)` from existing `emailService.ts` — reads `notification_preferences.primary_email + secondary_emails` for the org.

**Send:** calls `sendEmail(orgId, 'inventory_adjustment_request', { ... })`.

**Error handling:** swallow silently — `console.error` only. Never throws. Does not affect the adjustment row.

### 3. Email type union

**File:** `lib/services/emailService.ts`

Add `'inventory_adjustment_request'` to the `emailType` parameter union.

### 4. Email template

**File:** `email/InventoryAdjustmentRequest.tsx`

- **Subject:** `[Laza] {employee_name} requested an inventory adjustment — {item_name}`
- **Preview:** same as subject
- **Body sections:**
  - Header: Laza logo + "Inventory Adjustment Request"
  - Details card: employee name, item name + unit, location, storage space (if set), action type, previous → new quantity, notes (if set)
  - CTA button → `/admin/inventory`
  - Footer: standard automated-message footer
- **Visual style:** matches `LowStockAlert.tsx` (blue header, white card, inline metrics)

---

## Data Flow

```
Employee submits in QuantityUpdateSheet
  → createInventoryUpdateRequest(...) → returns { id }   [existing, return type extended]
  → sendInventoryAdjustmentNotification(id)               [new, called by A6/Sardor]
      → fetch request + joins
      → getRecipients(orgId)
      → sendEmail → Resend → admin inbox
      [errors swallowed]
```

---

## What is NOT in scope

- B3 (notification preferences guard) — skip for demo cutoff
- Any changes to the admin approval UI
- Any changes to the employee-facing sheet (A6 is Sardor's)
