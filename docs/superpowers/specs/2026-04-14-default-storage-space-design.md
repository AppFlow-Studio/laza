# Default Storage Space Creation — Design Spec

**Date:** 2026-04-14
**Status:** Approved

## Overview

When a super-admin creates a new store via the `StoreSetupWizard`, the system automatically creates a "Default Storage" space (refrigerated) containing every catalog item assigned with a quantity of 0. No user interaction is required — this happens silently during final submission.

## Scope

Single file change: `components/super-admin/stores/wizard/StoreSetupWizard.tsx`

## Implementation

### 1. Consume `useItems()`

Add `useItems()` from `lib/hooks/queries/useItems` to the wizard component. It returns all catalog items scoped to the current organization (already filtered by `organizationId`). The query is already cached by React Query so no extra network cost during submission.

### 2. Extend `handleSubmit`

After creating user-defined storage spaces and their item assignments, append:

**a. Create the default space**
```ts
const defaultSpace = await createStorageSpaceMutation.mutateAsync({
    location_id: location.id,
    name: 'Default Storage',
    temperature_type: 'refrigerated',
});
```

**b. Assign all items (quantity 0)**
```ts
const allItems = (items ?? []).map(item => ({
    itemId: item.id,
    quantity: 0,
    minQuantityOverride: null,
}));

if (allItems.length > 0) {
    await bulkAssignMutation.mutateAsync({
        locationId: location.id,
        storageSpaceId: defaultSpace.id,
        items: allItems,
    });
}
```

Both calls sit inside the existing try/catch, so failures surface via the existing error toast.

## Data Flow

```
handleSubmit
  ├── createLocation          → location.id
  ├── createStorageSpaces[]   → user-defined spaces
  ├── bulkAssign[]            → user-defined item assignments
  ├── createStorageSpace      → "Default Storage" (refrigerated)
  └── bulkAssign              → all catalog items, qty 0
```

## Error Handling

No new error handling. Any failure in default space creation or item assignment throws and is caught by the existing try/catch, showing the existing error toast and leaving `isSubmitting` false.

## What Does NOT Change

- Wizard steps (still 5 steps, no UI changes)
- Admin `LocationSetupWizard` (separate wizard, not touched)
- Any Supabase queries or mutations (reuse existing)
- Any other files
