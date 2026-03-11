"use client";

// This step is a thin wrapper that re-exports the shared AssignItemsStep component.
// It accepts the same props and passes them through unchanged so the wizard
// can import from a consistent path without duplicating logic.

export { default } from '@/components/admin/locations/wizard/steps/AssignItemsStep';
export type { ItemAssignmentData } from '@/components/admin/locations/wizard/steps/AssignItemsStep';
