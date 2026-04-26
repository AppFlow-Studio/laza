# PO Receiving Flow Redesign

**Date:** 2026-04-14  
**Scope:** `ReceivingWizard`, both receive pages, both PO detail pages

---

## Problem

Currently Phase A's "Confirm Receipt" button immediately fires the `receive_purchase_order` RPC, marking the PO as `received` and updating inventory — before the user has assigned items to pallets. This creates a partial state where the PO is received but has no pallets, which requires a recovery path.

## Goal

- Phase A collects data only; no API call until Phase B.
- Phase B has a single "Receive & Assign to Pallets" button that does both operations.
- Phase B button is disabled until the user has assigned at least one box to a pallet.
- PO detail page shows assigned pallets when the PO is received.

---

## Changes

### 1. ReceivingWizard (`components/super-admin/shipment/ReceivingWizard.tsx`)

**Phase A submit (`handlePhaseASubmit`):**
- Remove the `confirmReceipt.mutateAsync()` call entirely.
- Just save `phaseAData` to state and call `goTo(2)`.
- No toast, no loading state on Phase A.

**Phase B submit (`handlePhaseBSubmit`):**
- If `initialStep !== 2` (normal flow — PO not yet received):
  1. Call `confirmReceipt.mutateAsync(...)` — marks PO received, updates inventory.
  2. On success, call `assignToPallets.mutateAsync(...)` — creates pallets.
- If `initialStep === 2` (PO already received, assigning pallets retroactively):
  1. Skip `confirmReceipt`, only call `assignToPallets.mutateAsync(...)`.
- Loading label: show "Receiving…" while `confirmReceipt` is pending, then "Creating pallets…" while `assignToPallets` is pending.

**Phase B button disabled condition:**
- Disabled when no pallet in `PhaseBData.pallets` has any item with `box_count > 0`.
- The `PhaseBStep` already exposes an `onSubmit` with `PhaseBData`; the wizard reads the current form state or receives a validity signal from `PhaseBStep` to control the button.
- Simplest implementation: `PhaseBStep` accepts an `onValidityChange: (valid: boolean) => void` prop and calls it whenever the pallet assignments change.

**Footer button labels:**
- Step 1: `Next →` (was `Confirm Receipt →`)
- Step 2: `Receive & Assign to Pallets` (was `Complete Receiving`)

**Cancel dialog — removed:**
- Since no API call is made until Phase B fires, it is always safe to cancel at any point. The `showCancelDialog` state, `phaseADone` flag, and the dialog JSX are removed.
- `handleCancelClick` simplifies to: if on step 2 and `initialStep === 1`, go back to step 1; otherwise call `onCancel()`.

**`phaseADone` flag — removed:**
- Was only used to guard the cancel dialog and disable the back button after Phase A committed. Both are no longer needed.

---

### 2. Receive pages (both)

Both pages (`purchase-orders/[id]/receive/page.tsx` and `warehouse/[id]/purchase-orders/[poId]/receive/page.tsx`) have a "Case B" branch that shows a recovery UI when `po.status === "received"` but no pallets exist. This branch can remain as-is — it handles the edge case where `assignShipmentToPallets` failed after `confirmReceipt` succeeded.

No other changes needed in the receive pages.

---

### 3. PO Detail Pages (both)

Applies to:
- `app/(dashboard)/super-admin/purchase-orders/[id]/page.tsx`
- `app/(dashboard)/super-admin/warehouse/[id]/purchase-orders/[poId]/page.tsx`

**New pallets section:**
- Add `usePallets(po.warehouse.id, { purchaseOrderId: id })` query (both pages have `po.warehouse.id` available via the existing `getPurchaseOrderByIdAction` select).
- Render a "Pallets" card below the line items table **only when** `po.status === "received"` AND `pallets.length > 0`.
- Each pallet row: pallet label (monospace), box count, received date, linking to `/super-admin/warehouse/${po.warehouse.id}/pallets/${pallet.id}`.
- The warehouse-context page already has the `warehouseId` route param — both link targets are identical since `po.warehouse.id` is the same value.
- Use the same `ExistingPalletsList` visual style already used in the receive pages.

**Status restriction:**
- The `Advance Status` dropdown already excludes `received` from all status transitions (`NEXT_STATUSES.arrived = ["cancelled"]`). The only path to `received` is through Phase B of the wizard.
- Since Phase B's button is disabled until pallets are assigned, `received` status is unreachable without pallet assignment. No additional guard needed.

---

## Data Flow

```
Phase A (client only)
  └─ validate form → save to phaseAData state → goTo(2)

Phase B (on submit)
  ├─ [if initialStep=1] confirmPOReceiptAction → PO status=received, inventory updated
  └─ assignShipmentToPalletsAction → pallets created, PO linked
```

---

## Files Changed

| File | Change |
|------|--------|
| `components/super-admin/shipment/ReceivingWizard.tsx` | Remove Phase A API call, combine in Phase B, remove cancel dialog, update button labels |
| `components/super-admin/shipment/PhaseBStep.tsx` | Add `onValidityChange` prop to signal whether any boxes are assigned |
| `app/(dashboard)/super-admin/purchase-orders/[id]/page.tsx` | Add pallets section for received POs |
| `app/(dashboard)/super-admin/warehouse/[id]/purchase-orders/[poId]/page.tsx` | Add pallets section for received POs |

The two receive pages require no changes.
