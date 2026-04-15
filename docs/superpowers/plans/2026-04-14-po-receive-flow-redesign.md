# PO Receiving Flow Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the `receive_purchase_order` API call from Phase A to Phase B so both receipt confirmation and pallet assignment happen in a single action, and show assigned pallets on both PO detail pages.

**Architecture:** `PhaseBStep` gains an `onValidityChange` callback to signal the wizard whether any boxes have been assigned (controls button disabled state). `ReceivingWizard` Phase A becomes a pure local state step; Phase B fires `confirmReceipt` then `assignToPallets` sequentially. Both PO detail pages gain a pallets section rendered only when `status === "received"` and pallets exist.

**Tech Stack:** Next.js App Router, React Hook Form + Zod, TanStack React Query, Tailwind CSS, Framer Motion, Lucide icons, `date-fns`

---

## File Map

| File | Change |
|------|--------|
| `components/super-admin/shipment/PhaseBStep.tsx` | Add `onValidityChange` prop; call it via `useEffect` when pallet validity changes |
| `components/super-admin/shipment/ReceivingWizard.tsx` | Remove Phase A API call; combine receipt + pallet assignment in Phase B; remove cancel dialog; update button labels |
| `app/(dashboard)/super-admin/purchase-orders/[id]/page.tsx` | Add pallets section (query + JSX) |
| `app/(dashboard)/super-admin/warehouse/[id]/purchase-orders/[poId]/page.tsx` | Add pallets section (query + JSX) |

---

### Task 1: Add `onValidityChange` to PhaseBStep

**Files:**
- Modify: `components/super-admin/shipment/PhaseBStep.tsx`

- [ ] **Step 1: Add `onValidityChange` to the `PhaseBStepProps` interface and wire it up**

  In `PhaseBStep.tsx`, update the interface and component signature, then add a `useEffect` that fires whenever pallet validity changes. A form is "valid enough to submit" when at least one pallet has at least one item with at least one `box_count > 0`.

  Replace the existing interface and function signature:

  ```tsx
  // Old interface (line 476-484):
  interface PhaseBStepProps {
      po: POForPhaseB;
      phaseAData: PhaseAData;
      warehouseLocationId: string;
      organizationId: string;
      onSubmit: (data: PhaseBData) => void;
      onSkip: () => void;
      isLoading: boolean;
  }

  export function PhaseBStep({ po, phaseAData, onSubmit }: PhaseBStepProps) {
  ```

  Replace with:

  ```tsx
  interface PhaseBStepProps {
      po: POForPhaseB;
      phaseAData: PhaseAData;
      warehouseLocationId: string;
      organizationId: string;
      onSubmit: (data: PhaseBData) => void;
      onValidityChange: (valid: boolean) => void;
      isLoading: boolean;
  }

  export function PhaseBStep({ po, phaseAData, onSubmit, onValidityChange }: PhaseBStepProps) {
  ```

- [ ] **Step 2: Add the validity `useEffect` inside `PhaseBStep`, after the existing `useWatch` line**

  The existing `useWatch` line is:
  ```tsx
  const watchedPallets = useWatch({ control, name: "pallets" }) ?? [];
  ```

  Add this immediately after it (requires adding `useEffect` to the React import at the top of the file):

  ```tsx
  // Add to the React import at top of file:
  import { useForm, useFieldArray, Controller, useWatch, useEffect } from "react-hook-form";
  ```

  Then after `const watchedPallets = ...`:

  ```tsx
  useEffect(() => {
      const valid = watchedPallets.some((p: PhaseBData["pallets"][number]) =>
          p.items.some((it) =>
              it.box_configs.some((c) => (c.box_count ?? 0) > 0)
          )
      );
      onValidityChange(valid);
  }, [watchedPallets, onValidityChange]);
  ```

- [ ] **Step 3: Verify the file compiles**

  Run:
  ```bash
  cd C:/Users/sarik/WebstormProjects/laza && npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors in `PhaseBStep.tsx`. (Other pre-existing errors are fine.)

- [ ] **Step 4: Commit**

  ```bash
  cd C:/Users/sarik/WebstormProjects/laza && git add components/super-admin/shipment/PhaseBStep.tsx && git commit -m "feat: add onValidityChange callback to PhaseBStep"
  ```

---

### Task 2: Refactor ReceivingWizard — Phase A no-op, Phase B combined action

**Files:**
- Modify: `components/super-admin/shipment/ReceivingWizard.tsx`

- [ ] **Step 1: Replace the full `ReceivingWizard.tsx` content**

  The file needs several interlocking changes. Replace the entire file with:

  ```tsx
  "use client";

  import { useState, useCallback } from "react";
  import { motion, AnimatePresence } from "motion/react";
  import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import toast from "react-hot-toast";
  import { useConfirmPOReceipt, useAssignShipmentToPallets } from "@/lib/hooks/queries/useReceiving";
  import { PhaseAStep, type PhaseAData } from "./PhaseAStep";
  import { PhaseBStep, type PhaseBData } from "./PhaseBStep";
  import { getFriendlyErrorMessage } from "@/lib/utils/errorMessages";

  type POForReceiving = {
      id: string;
      po_number: string;
      supplier_name: string | null;
      organization_id: string;
      expected_arrival: string | null;
      actual_arrival: string | null;
      purchase_order_items: {
          id: string;
          item_id: number;
          quantity_ordered: number;
          quantity_received: number | null;
          pieces_per_box: number;
          unit_cost_after: number | null;
          cbm: number | null;
          cartons: number | null;
          items: {
              id: number;
              name: string;
              short_label: string | null;
              sku: string | null;
              box_quantity: number | null;
          } | null;
      }[];
  };

  interface ReceivingWizardProps {
      po: POForReceiving;
      warehouseLocationId: string;
      organizationId: string;
      /**
       * Start at step 2 (pallet assignment) when the PO was already received
       * but pallets were never created. Wizard auto-reconstructs PhaseA data
       * from the PO's stored quantity_received values.
       */
      initialStep?: 1 | 2;
      onComplete: () => void;
      onCancel: () => void;
  }

  const STEPS = [
      { num: 1, label: "Confirm Receipt" },
      { num: 2, label: "Assign to Pallets" },
  ];

  /** Rebuild PhaseA data from an already-received PO so Phase B can run standalone. */
  function reconstructPhaseAData(po: POForReceiving): PhaseAData {
      const { format } = require("date-fns");
      return {
          actualArrivalDate: po.actual_arrival ?? format(new Date(), "yyyy-MM-dd"),
          notes: "",
          lineItems: po.purchase_order_items.map((item) => ({
              item_id:           item.item_id,
              po_item_id:        item.id,
              quantity_ordered:  item.quantity_ordered,
              pieces_per_box:    item.pieces_per_box,
              quantity_received: item.quantity_received ?? item.quantity_ordered,
          })),
      };
  }

  export function ReceivingWizard({
      po,
      warehouseLocationId,
      organizationId,
      initialStep = 1,
      onComplete,
      onCancel,
  }: ReceivingWizardProps) {
      const [currentStep, setCurrentStep] = useState(initialStep);
      const [direction, setDirection]     = useState(1);
      const [phaseAData, setPhaseAData]   = useState<PhaseAData | null>(
          initialStep === 2 ? reconstructPhaseAData(po) : null
      );
      const [phaseBValid, setPhaseBValid] = useState(false);

      const confirmReceipt  = useConfirmPOReceipt();
      const assignToPallets = useAssignShipmentToPallets();

      const goTo = useCallback(
          (step: number) => {
              setDirection(step > currentStep ? 1 : -1);
              setCurrentStep(step);
          },
          [currentStep]
      );

      // ── Phase A: just save data and advance — no API call ─────────────────
      const handlePhaseASubmit = (data: PhaseAData) => {
          setPhaseAData(data);
          goTo(2);
      };

      // ── Phase B: confirm receipt first (if not already received), then assign pallets ──
      const handlePhaseBSubmit = async (data: PhaseBData) => {
          try {
              // Only call confirmReceipt when PO hasn't been received yet
              if (initialStep !== 2) {
                  await confirmReceipt.mutateAsync({
                      purchaseOrderId:   po.id,
                      receivedItems:     phaseAData!.lineItems.map((li) => ({
                          item_id:           li.item_id,
                          quantity_received: li.quantity_received,
                      })),
                      actualArrivalDate: phaseAData!.actualArrivalDate,
                  });
              }

              await assignToPallets.mutateAsync({
                  purchaseOrderId:    po.id,
                  organizationId,
                  warehouseLocationId,
                  palletAssignments: data.pallets.map((p) => ({
                      pallet_label: p.pallet_label,
                      items: p.items
                          .filter((it) =>
                              it.box_configs.some((c) => (c.box_count ?? 0) > 0)
                          )
                          .map((it) => ({
                              item_id:                it.item_id,
                              purchase_order_item_id: it.purchase_order_item_id,
                              box_configs: it.box_configs
                                  .filter((c) => (c.box_count ?? 0) > 0)
                                  .map((c) => ({
                                      pieces_per_box: c.pieces_per_box,
                                      box_count:      c.box_count,
                                  })),
                          })),
                  })),
              });

              toast.success(
                  `Shipment received. ${data.pallets.length} pallet${data.pallets.length !== 1 ? "s" : ""} created.`
              );
              onComplete();
          } catch (err: unknown) {
              toast.error(getFriendlyErrorMessage(err));
          }
      };

      const handleCancelClick = () => {
          if (currentStep > 1 && initialStep === 1) {
              goTo(1);
          } else {
              onCancel();
          }
      };

      const isPhaseALoading = false; // Phase A no longer calls any API
      const isPhaseBLoading = confirmReceipt.isPending || assignToPallets.isPending;

      // Label for the Phase B loading state
      const phaseBLoadingLabel = confirmReceipt.isPending
          ? "Receiving…"
          : "Creating pallets…";

      return (
          <div className="flex flex-col h-full max-h-[90vh]">
              {/* ── Header ── */}
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 flex-shrink-0">
                  <div>
                      <h1 className="text-lg font-semibold text-zinc-900">
                          {initialStep === 2 ? "Assign to Pallets" : "Receiving Shipment"}
                      </h1>
                      <p className="mt-0.5 text-sm text-zinc-500">
                          {po.po_number}
                          {po.supplier_name ? ` · ${po.supplier_name}` : ""}
                          {initialStep === 1 && ` · Step ${currentStep} of ${STEPS.length}`}
                      </p>
                  </div>
                  <button
                      onClick={handleCancelClick}
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                      aria-label="Cancel"
                  >
                      <X className="h-5 w-5" />
                  </button>
              </div>

              {/* ── Progress bar (only shown for full flow) ── */}
              {initialStep === 1 && (
                  <div className="px-6 pt-4 flex-shrink-0">
                      <div className="flex gap-1.5">
                          {STEPS.map((s) => (
                              <div key={s.num} className="flex-1">
                                  <div
                                      className={`h-1.5 rounded-full transition-all duration-500 ${
                                          currentStep >= s.num ? "bg-indigo-600" : "bg-zinc-100"
                                      }`}
                                  />
                                  <p
                                      className={`mt-1.5 text-xs font-medium ${
                                          currentStep === s.num
                                              ? "text-indigo-600"
                                              : currentStep > s.num
                                                  ? "text-zinc-400"
                                                  : "text-zinc-300"
                                      }`}
                                  >
                                      Step {s.num}: {s.label}
                                  </p>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* ── Step Content ── */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                  <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                          key={currentStep}
                          initial={{ opacity: 0, x: direction * 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: direction * -24 }}
                          transition={{ duration: 0.18 }}
                      >
                          {currentStep === 1 && (
                              <PhaseAStep
                                  po={po}
                                  onSubmit={handlePhaseASubmit}
                                  isLoading={isPhaseALoading}
                              />
                          )}
                          {currentStep === 2 && phaseAData && (
                              <PhaseBStep
                                  po={po}
                                  phaseAData={phaseAData}
                                  warehouseLocationId={warehouseLocationId}
                                  organizationId={organizationId}
                                  onSubmit={handlePhaseBSubmit}
                                  onValidityChange={setPhaseBValid}
                                  isLoading={isPhaseBLoading}
                              />
                          )}
                      </motion.div>
                  </AnimatePresence>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 flex-shrink-0">
                  <Button
                      variant="outline"
                      onClick={handleCancelClick}
                      disabled={isPhaseBLoading}
                      size="sm"
                  >
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      {currentStep === 1 ? "Cancel" : "Back"}
                  </Button>

                  {currentStep === 1 && (
                      <Button
                          onClick={() =>
                              document
                                  .getElementById("phase-a-form")
                                  ?.dispatchEvent(
                                      new Event("submit", { cancelable: true, bubbles: true })
                                  )
                          }
                          size="sm"
                      >
                          Next
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                  )}

                  {currentStep === 2 && (
                      <Button
                          onClick={() =>
                              document
                                  .getElementById("phase-b-form")
                                  ?.dispatchEvent(
                                      new Event("submit", { cancelable: true, bubbles: true })
                                  )
                          }
                          disabled={isPhaseBLoading || !phaseBValid}
                          size="sm"
                      >
                          {isPhaseBLoading ? (
                              <>
                                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                  {phaseBLoadingLabel}
                              </>
                          ) : (
                              "Receive & Assign to Pallets"
                          )}
                      </Button>
                  )}
              </div>
          </div>
      );
  }
  ```

- [ ] **Step 2: Verify no TypeScript errors**

  ```bash
  cd C:/Users/sarik/WebstormProjects/laza && npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: no errors in `ReceivingWizard.tsx` or `PhaseBStep.tsx`.

- [ ] **Step 3: Manual smoke test**

  Start the dev server (`npm run dev`) and navigate to a PO in `in_transit` or `arrived` status. Click "Receive Shipment":
  - Phase A: fill in quantities — "Next" button (not "Confirm Receipt")
  - Clicking "Next" should advance to Phase B with no API call (PO status stays the same)
  - Phase B: "Receive & Assign to Pallets" button should be **disabled** until you enter at least one `box_count > 0`
  - After assigning a box, button enables
  - Clicking the button should show "Receiving…" then "Creating pallets…" then redirect on success

- [ ] **Step 4: Commit**

  ```bash
  cd C:/Users/sarik/WebstormProjects/laza && git add components/super-admin/shipment/ReceivingWizard.tsx && git commit -m "feat: move receipt confirmation to Phase B, combine with pallet assignment"
  ```

---

### Task 3: Add pallets section to `purchase-orders/[id]/page.tsx`

**Files:**
- Modify: `app/(dashboard)/super-admin/purchase-orders/[id]/page.tsx`

- [ ] **Step 1: Add `usePallets` import**

  The current imports block ends with:
  ```tsx
  import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
  import toast from "react-hot-toast";
  ```

  Add after those two lines:
  ```tsx
  import { usePallets } from "@/lib/hooks/queries/usePallets";
  import { Layers, ChevronRight } from "lucide-react";
  import { format } from "date-fns";
  ```

  Also add `Link` to the existing `next/link` import — check if it's already there:
  ```tsx
  import Link from "next/link";
  ```
  (It already exists in the file, no change needed.)

- [ ] **Step 2: Add the `usePallets` query inside the page component**

  Inside `PurchaseOrderDetailPage`, after the existing hooks:
  ```tsx
  const { data: po, isLoading } = usePurchaseOrder(id);
  const deletePO = useDeletePurchaseOrder();
  ```

  Add:
  ```tsx
  const { data: pallets = [] } = usePallets(
      po?.warehouse?.id,
      { purchaseOrderId: id }
  );
  ```

- [ ] **Step 3: Add the pallets section JSX**

  In the return statement, after the Notes block and before the Danger zone block, add:

  ```tsx
  {/* Pallets — only shown when received and pallets exist */}
  {status === "received" && pallets.length > 0 && (
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Pallets</h2>
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-xs">
                  {pallets.length}
              </span>
          </div>
          <div className="divide-y divide-zinc-100">
              {pallets.map((pallet) => (
                  <Link
                      key={pallet.id}
                      href={`/super-admin/warehouse/${po.warehouse.id}/pallets/${pallet.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-indigo-100 transition-colors">
                              <Layers className="h-4 w-4 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                          </div>
                          <div>
                              <p className="font-mono text-sm font-semibold text-zinc-900">
                                  {pallet.pallet_label}
                              </p>
                              <p className="text-xs text-zinc-400">
                                  {pallet.total_boxes ?? 0} boxes
                                  {pallet.received_at
                                      ? ` · received ${format(new Date(pallet.received_at), "MMM d, yyyy")}`
                                      : ""}
                              </p>
                          </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                  </Link>
              ))}
          </div>
      </div>
  )}
  ```

  Place it between the Notes block closing `})()}` and the Danger zone block `{status === "draft" && (`.

- [ ] **Step 4: Verify TypeScript**

  ```bash
  cd C:/Users/sarik/WebstormProjects/laza && npx tsc --noEmit 2>&1 | grep "purchase-orders/\[id\]/page"
  ```

  Expected: no output (no errors in this file).

- [ ] **Step 5: Manual smoke test**

  Navigate to a received PO at `/super-admin/purchase-orders/<id>`. Confirm:
  - Pallets section appears with correct pallet labels, box counts, and received dates
  - Each row links to the correct warehouse pallet detail page
  - Section is absent on a PO that is not `received`

- [ ] **Step 6: Commit**

  ```bash
  cd C:/Users/sarik/WebstormProjects/laza && git add "app/(dashboard)/super-admin/purchase-orders/[id]/page.tsx" && git commit -m "feat: show assigned pallets on PO detail page"
  ```

---

### Task 4: Add pallets section to `warehouse/[id]/purchase-orders/[poId]/page.tsx`

**Files:**
- Modify: `app/(dashboard)/super-admin/warehouse/[id]/purchase-orders/[poId]/page.tsx`

- [ ] **Step 1: Add imports**

  After the existing import block:
  ```tsx
  import { usePurchaseOrder, useUpdatePurchaseOrderStatus, useDeletePurchaseOrder } from "@/lib/hooks/queries/usePurchaseOrders";
  import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
  import toast from "react-hot-toast";
  ```

  Add:
  ```tsx
  import { usePallets } from "@/lib/hooks/queries/usePallets";
  import { Layers, ChevronRight } from "lucide-react";
  import { format } from "date-fns";
  ```

  `Link` is already imported. `Layers` and `ChevronRight` are not currently imported in this file — add them. (Note: other icons like `Ship`, `Package` etc. are imported from `lucide-react` already — add `Layers` and `ChevronRight` to that same import line.)

  The existing lucide import:
  ```tsx
  import {
      ArrowLeft, Ship, Package, ChevronDown,
      CheckCircle2, XCircle, Clock, Anchor,
      FileText, DollarSign, Calendar, Hash,
      Boxes, AlertCircle, Pencil, PackageCheck, Warehouse,
  } from "lucide-react";
  ```

  Replace with:
  ```tsx
  import {
      ArrowLeft, Ship, Package, ChevronDown,
      CheckCircle2, XCircle, Clock, Anchor,
      FileText, DollarSign, Calendar, Hash,
      Boxes, AlertCircle, Pencil, PackageCheck, Warehouse,
      Layers, ChevronRight,
  } from "lucide-react";
  ```

  Then add after the existing hooks imports:
  ```tsx
  import { usePallets } from "@/lib/hooks/queries/usePallets";
  import { format } from "date-fns";
  ```

- [ ] **Step 2: Add the `usePallets` query inside the page component**

  Inside `PurchaseOrderDetailPage`, after the existing hooks:
  ```tsx
  const { data: po, isLoading } = usePurchaseOrder(poId);
  const deletePO = useDeletePurchaseOrder();
  ```

  Add:
  ```tsx
  const { data: pallets = [] } = usePallets(
      po?.warehouse?.id,
      { purchaseOrderId: poId }
  );
  ```

- [ ] **Step 3: Add the pallets section JSX**

  Same JSX as Task 3, Step 3. Place it between the Notes block and the Danger zone block:

  ```tsx
  {/* Pallets — only shown when received and pallets exist */}
  {status === "received" && pallets.length > 0 && (
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Pallets</h2>
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-xs">
                  {pallets.length}
              </span>
          </div>
          <div className="divide-y divide-zinc-100">
              {pallets.map((pallet) => (
                  <Link
                      key={pallet.id}
                      href={`/super-admin/warehouse/${po.warehouse.id}/pallets/${pallet.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-indigo-100 transition-colors">
                              <Layers className="h-4 w-4 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                          </div>
                          <div>
                              <p className="font-mono text-sm font-semibold text-zinc-900">
                                  {pallet.pallet_label}
                              </p>
                              <p className="text-xs text-zinc-400">
                                  {pallet.total_boxes ?? 0} boxes
                                  {pallet.received_at
                                      ? ` · received ${format(new Date(pallet.received_at), "MMM d, yyyy")}`
                                      : ""}
                              </p>
                          </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                  </Link>
              ))}
          </div>
      </div>
  )}
  ```

- [ ] **Step 4: Verify TypeScript**

  ```bash
  cd C:/Users/sarik/WebstormProjects/laza && npx tsc --noEmit 2>&1 | grep "warehouse/\[id\]/purchase-orders"
  ```

  Expected: no output.

- [ ] **Step 5: Manual smoke test**

  Navigate to a received PO at `/super-admin/warehouse/<warehouseId>/purchase-orders/<poId>`. Confirm:
  - Pallets section appears with correct data
  - Each row links to `/super-admin/warehouse/<warehouseId>/pallets/<palletId>`
  - Section is absent when the PO is not `received`

- [ ] **Step 6: Commit**

  ```bash
  cd C:/Users/sarik/WebstormProjects/laza && git add "app/(dashboard)/super-admin/warehouse/[id]/purchase-orders/[poId]/page.tsx" && git commit -m "feat: show assigned pallets on warehouse PO detail page"
  ```

---

## Self-Review

**Spec coverage:**
- ✅ Phase A "Next" (no API call) — Task 2
- ✅ Phase B "Receive & Assign to Pallets" (both RPCs) — Task 2
- ✅ Phase B button disabled until boxes assigned — Tasks 1 + 2
- ✅ `initialStep=2` skips `confirmReceipt` — Task 2
- ✅ Cancel dialog removed — Task 2
- ✅ `phaseADone` removed — Task 2
- ✅ PO detail page pallets section (`purchase-orders/[id]`) — Task 3
- ✅ PO detail page pallets section (`warehouse/[id]/purchase-orders/[poId]`) — Task 4
- ✅ Pallets section only when `received` AND `pallets.length > 0` — Tasks 3 + 4

**Type consistency:**
- `onValidityChange: (valid: boolean) => void` defined in Task 1, consumed in Task 2 as `onValidityChange={setPhaseBValid}` ✅
- `phaseBValid: boolean` state in wizard, controls `disabled={isPhaseBLoading || !phaseBValid}` ✅
- `pallets` from `usePallets` — shape includes `id`, `pallet_label`, `total_boxes`, `received_at` per the existing `ExistingPalletsList` usage in the receive pages ✅
- `po.warehouse.id` available from `getPurchaseOrderByIdAction` which selects `warehouse:locations(id, name)` ✅
