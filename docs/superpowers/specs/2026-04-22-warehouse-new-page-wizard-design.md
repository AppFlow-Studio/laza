# Warehouse Creation Wizard — Design Spec

**Date:** 2026-04-22
**Feature:** `/super-admin/warehouse/new` — 2-step wizard for creating a new warehouse location

---

## Context

Warehouses are `locations` rows with `location_type = 'warehouse'`. The warehouse list page (`/super-admin/warehouse`) already has an "Add Warehouse" button linking to `/super-admin/warehouse/new`, but no page exists there. This spec defines the creation wizard.

Unlike stores, warehouses have no storage spaces, no assigned employees, and no initial item assignments at creation time. The wizard is therefore minimal: details + review.

---

## File Structure

```
app/(dashboard)/super-admin/warehouse/new/page.tsx          ← thin page shell
components/super-admin/warehouse/wizard/
  WarehouseSetupWizard.tsx                                   ← orchestrator
  WarehouseWizardSidebar.tsx                                 ← step nav sidebar
  steps/
    WarehouseDetailsStep.tsx                                 ← Step 1 form
    WarehouseConfirmationStep.tsx                            ← Step 2 review + success
```

---

## Steps

### Step 1 — Warehouse Details

Fields:
- **Name** (required, text input)
- **Address** — structured object: `{ street, city, state, zip }` (all required, matching store format)
- **Map pin** (optional) — Google Maps picker with "Use address" geocode button, same implementation as `StoreDetailsStep`
- **Active** toggle (default: true)

Validation via Zod + react-hook-form. Form id `"warehouse-details-form"` for `requestSubmit()` from the wizard footer.

### Step 2 — Review & Create

Pre-submission state:
- Summary card showing name, formatted address, active status
- "Edit" button (pencil) jumps back to Step 1
- "Create Warehouse" primary button in the wizard footer triggers `handleSubmit()`

Post-submission success state (replaces review content):
- Green checkmark circle
- "Warehouse is ready!" heading
- Description with warehouse name
- "View Warehouse" link → `/super-admin/warehouse/[createdId]`

---

## Data Layer

### `createLocation` update

`lib/supabase/queries/locations.ts` — add optional `location_type` to the function's input type. When not provided, behaviour is unchanged (existing callers unaffected). The warehouse wizard passes `location_type: 'warehouse'`.

### Wizard mutation flow

1. Call `createLocationMutation.mutateAsync({ ..., location_type: 'warehouse' })`
2. On success: store `createdLocationId`, show success screen
3. On error: `toast.error(...)`, keep form editable

Invalidates `['locations']` and `['warehouses']` query keys (the existing `useCreateLocation` hook already invalidates `['locations']`; the wizard also invalidates `['warehouses']` manually after success).

---

## Wizard Orchestrator (`WarehouseSetupWizard.tsx`)

State:
- `currentStep: 1 | 2`
- `completedSteps: Set<number>`
- `direction: 1 | -1` (for slide animation)
- `warehouseData: WarehouseFormData | null`
- `isSubmitting: boolean`
- `createdLocationId: string | null`

Navigation:
- Step 1 → 2: trigger form `requestSubmit()`, handler sets `warehouseData` and calls `goToStep(2)`
- Step 2 → 1: back button
- Footer Next button visible on step 1; footer submit visible on step 2 (until created)

Layout: identical to `StoreSetupWizard` — back link, title, progress bar, sidebar (desktop), animated step content, footer nav.

---

## Sidebar (`WarehouseWizardSidebar.tsx`)

Two items:
1. Warehouse Details
2. Review & Create

Same dot/check/active styling as `StoreWizardSidebar`. Clicking a completed step navigates back.

---

## Constraints

- No storage spaces, item assignments, or employee invitations
- `location_type` update to `createLocation` must be backward-compatible (optional field, existing callers pass nothing)
- Map picker is optional — warehouse can be created without coordinates
- After creation, redirect is NOT automatic; user clicks "View Warehouse"
