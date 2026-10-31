# Track B — Inventory Adjustment Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an employee submits an inventory adjustment request, automatically email the store admin(s) with full details and a link to the approval page.

**Architecture:** Four targeted changes — return the new request ID from the insert, expand the email type union in two files, create a React Email template, and create a `sendInventoryAdjustmentNotification(requestId)` server action that fetches details + sends via the existing Resend client. The frontend hook (A6, Sardor) will call the new action after a successful insert using the returned ID.

**Tech Stack:** Next.js App Router, Supabase (server client), Resend (`resend` npm package), React Email (`@react-email/components`), TypeScript strict mode.

---

## File Map

| Action | Path | What changes |
|--------|------|--------------|
| Modify | `lib/supabase/queries/inventoryUpdateRequests.ts` | Return `{ id: string }` from `createInventoryUpdateRequest` |
| Modify | `lib/services/emailService.ts` | Add `'inventory_adjustment_request'` to `emailType` union |
| Modify | `lib/supabase/queries/emailDelivery.ts` | Add `'inventory_adjustment_request'` to `EmailDeliveryLog.email_type` union |
| Create | `lib/services/inventoryAdjustmentNotification.ts` | `sendInventoryAdjustmentNotification(requestId)` |
| Create | `email/InventoryAdjustmentRequest.tsx` | Email template component |

---

## B2 — Verification (no code change)

`CreateTicketInput.items` has no `unit_price` field. `createTicket()` snapshots the price server-side from `item_warehouse_pricing` before inserting `order_ticket_items`. The DB trigger `trg_snapshot_transfer_prices_on_submit` covers the draft→submitted UPDATE path. B2 **passes** — no action needed.

---

## Task 1: Return `{ id: string }` from `createInventoryUpdateRequest`

**Files:**
- Modify: `lib/supabase/queries/inventoryUpdateRequests.ts:17-49`

Currently the function signature is `Promise<void>` and the insert discards the returned row. Change it to select the inserted `id` and return it. The React Query hook (`useCreateInventoryUpdateRequest`) calls `mutateAsync` which will automatically surface the returned value — no hook changes needed.

- [ ] **Step 1: Update the function signature and insert**

Open `lib/supabase/queries/inventoryUpdateRequests.ts`. Replace the entire `createInventoryUpdateRequest` function (lines 17–50) with:

```ts
export async function createInventoryUpdateRequest(
  input: CreateInventoryUpdateRequestInput
): Promise<{ id: string }> {
  const supabase = createServerSupabaseClient();

  // Replace any existing pending request for the same item+location+storage slot
  const deleteQuery = supabase
    .from("inventory_update_requests")
    .delete()
    .eq("item_id",     input.itemId)
    .eq("location_id", input.locationId)
    .eq("status",      "pending");

  const { error: deleteError } = input.storageSpaceId
    ? await deleteQuery.eq("storage_space_id", input.storageSpaceId)
    : await deleteQuery.is("storage_space_id", null);

  if (deleteError) throw deleteError;

  const { data, error } = await supabase
    .from("inventory_update_requests")
    .insert({
      org_id:            input.orgId,
      location_id:       input.locationId,
      storage_space_id:  input.storageSpaceId,
      item_id:           input.itemId,
      requested_by:      input.requestedBy,
      action_type:       input.actionType,
      new_quantity:      input.newQuantity,
      previous_quantity: input.previousQuantity,
      notes:             input.notes ?? null,
      status:            "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `createInventoryUpdateRequest`. (There may be pre-existing errors in other files — ignore those.)

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/queries/inventoryUpdateRequests.ts
git commit -m "feat(b1): return new request id from createInventoryUpdateRequest"
```

---

## Task 2: Expand the email type unions

**Files:**
- Modify: `lib/services/emailService.ts:23`
- Modify: `lib/supabase/queries/emailDelivery.ts:10`

Both files have a union type for `email_type`. Add `'inventory_adjustment_request'` to both so TypeScript accepts the new email type throughout the send + log pipeline.

- [ ] **Step 1: Update `emailService.ts`**

In `lib/services/emailService.ts`, find the `sendEmail` function signature (around line 23). Change:

```ts
    emailType: 'low_stock_alert' | 'low_stock_digest' | 'daily_summary',
```

to:

```ts
    emailType: 'low_stock_alert' | 'low_stock_digest' | 'daily_summary' | 'inventory_adjustment_request',
```

- [ ] **Step 2: Update `emailDelivery.ts`**

In `lib/supabase/queries/emailDelivery.ts`, find the `EmailDeliveryLog` interface (around line 10). Change:

```ts
    email_type: 'low_stock_alert' | 'low_stock_digest' | 'daily_summary';
```

to:

```ts
    email_type: 'low_stock_alert' | 'low_stock_digest' | 'daily_summary' | 'inventory_adjustment_request';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors introduced by these changes.

- [ ] **Step 4: Commit**

```bash
git add lib/services/emailService.ts lib/supabase/queries/emailDelivery.ts
git commit -m "feat(b1): add inventory_adjustment_request to email type unions"
```

---

## Task 3: Create the email template

**Files:**
- Create: `email/InventoryAdjustmentRequest.tsx`

Follows the same visual structure as `email/LowStockAlert.tsx`: blue header with Laza logo, white content card, metric rows, CTA button, footer. Uses `@react-email/components`.

- [ ] **Step 1: Create the file**

Create `email/InventoryAdjustmentRequest.tsx` with the full content below:

```tsx
import React from 'react';
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Preview,
    Row,
    Column,
    Section,
    Text,
} from '@react-email/components';

const appUrl = 'https://lazadessert.cafe';

export interface InventoryAdjustmentRequestProps {
    employeeName: string;
    itemName: string;
    itemUnit: string;
    locationName: string;
    storageSpaceName: string | null;
    actionType: 'count' | 'adjustment' | 'used';
    previousQuantity: number;
    newQuantity: number;
    notes: string | null;
    approvalUrl: string;
}

const actionTypeLabel: Record<InventoryAdjustmentRequestProps['actionType'], string> = {
    count:      'Count',
    adjustment: 'Adjustment',
    used:       'Used',
};

export default function InventoryAdjustmentRequest({
    employeeName,
    itemName,
    itemUnit,
    locationName,
    storageSpaceName,
    actionType,
    previousQuantity,
    newQuantity,
    notes,
    approvalUrl,
}: InventoryAdjustmentRequestProps) {
    const quantityChange = newQuantity - previousQuantity;
    const changeLabel = quantityChange > 0 ? `+${quantityChange}` : String(quantityChange);
    const changeColor = quantityChange >= 0 ? '#16a34a' : '#dc2626';

    return (
        <Html>
            <Head />
            <Preview>
                {employeeName} requested an inventory adjustment — {itemName}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={headerSection}>
                        <Img
                            src={`${appUrl}/lazabluelogo.png`}
                            width="130"
                            height="auto"
                            alt="Laza Dessert Cafe"
                            style={logo}
                        />
                        <Heading style={headerTitle}>Inventory Adjustment Request</Heading>
                        <Text style={headerSubtitle}>Review and approve or reject below</Text>
                    </Section>

                    {/* Content */}
                    <Section style={contentSection}>
                        <Section style={detailCard}>
                            <Heading style={itemNameStyle}>{itemName}</Heading>

                            <Text style={detailText}>
                                <strong>Requested by:</strong> {employeeName}
                                <br />
                                <strong>Location:</strong> {locationName}
                                {storageSpaceName && (
                                    <>
                                        <br />
                                        <strong>Storage space:</strong> {storageSpaceName}
                                    </>
                                )}
                                <br />
                                <strong>Action type:</strong> {actionTypeLabel[actionType]}
                            </Text>

                            <Hr style={divider} />

                            <Row>
                                <Column style={metricColumn}>
                                    <Text style={metricLabel}>Previous</Text>
                                    <Text style={metricValue}>
                                        {previousQuantity} {itemUnit}
                                    </Text>
                                </Column>
                                <Column style={metricColumn}>
                                    <Text style={metricLabel}>New</Text>
                                    <Text style={metricValue}>
                                        {newQuantity} {itemUnit}
                                    </Text>
                                </Column>
                                <Column style={metricColumn}>
                                    <Text style={metricLabel}>Change</Text>
                                    <Text style={{ ...metricValue, color: changeColor }}>
                                        {changeLabel} {itemUnit}
                                    </Text>
                                </Column>
                            </Row>

                            {notes && (
                                <>
                                    <Hr style={divider} />
                                    <Text style={notesText}>
                                        <strong>Notes:</strong> {notes}
                                    </Text>
                                </>
                            )}
                        </Section>

                        {/* CTA */}
                        <Section style={actionSection}>
                            <Button href={approvalUrl} style={primaryButton}>
                                Review in Dashboard
                            </Button>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerText}>
                            This is an automated alert from your Laza inventory management system.
                        </Text>
                        <Text style={footerSignature}>Laza Dessert Cafe — Inventory Management</Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const main = {
    backgroundColor: '#f5f7fa',
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
    margin: '0 auto',
    padding: '20px',
};

const container = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '0 auto',
    maxWidth: '600px',
    padding: '0',
};

const headerSection = {
    backgroundColor: '#1e40af',
    borderRadius: '8px 8px 0 0',
    padding: '30px 20px',
    textAlign: 'center' as const,
};

const logo = {
    margin: '0 auto 20px',
    display: 'block',
};

const headerTitle = {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 10px',
    textAlign: 'center' as const,
};

const headerSubtitle = {
    color: '#e0e7ff',
    fontSize: '16px',
    margin: '0',
    textAlign: 'center' as const,
};

const contentSection = {
    padding: '30px 20px',
};

const detailCard = {
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
};

const itemNameStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 15px',
    color: '#1f2937',
};

const detailText = {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 15px',
    lineHeight: '1.7',
};

const divider = {
    borderColor: '#e5e7eb',
    margin: '15px 0',
};

const metricColumn = {
    padding: '10px',
    textAlign: 'center' as const,
};

const metricLabel = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 5px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const metricValue = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
};

const notesText = {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0',
    lineHeight: '1.6',
};

const actionSection = {
    margin: '20px 0',
    textAlign: 'center' as const,
};

const primaryButton = {
    backgroundColor: '#1e40af',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 28px',
};

const footerSection = {
    padding: '20px',
    textAlign: 'center' as const,
    borderTop: '1px solid #e5e7eb',
};

const footerText = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 10px',
};

const footerSignature = {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0',
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from the new template file.

- [ ] **Step 3: Commit**

```bash
git add email/InventoryAdjustmentRequest.tsx
git commit -m "feat(b1): add InventoryAdjustmentRequest email template"
```

---

## Task 4: Create `sendInventoryAdjustmentNotification` server action

**Files:**
- Create: `lib/services/inventoryAdjustmentNotification.ts`

Fetches the full request row (joined), resolves recipients, and fires the email. All errors are swallowed so a Resend failure never blocks the adjustment record.

- [ ] **Step 1: Create the file**

Create `lib/services/inventoryAdjustmentNotification.ts` with:

```ts
"use server";

import React from 'react';
import { createServiceRoleClient } from '../supabase/server';
import { sendEmail, getRecipients } from './emailService';
import InventoryAdjustmentRequest from '../../email/InventoryAdjustmentRequest';

const appUrl = 'https://lazadessert.cafe';

export async function sendInventoryAdjustmentNotification(requestId: string): Promise<void> {
    try {
        const supabase = createServiceRoleClient();

        const { data: req, error } = await supabase
            .from('inventory_update_requests')
            .select(`
                id,
                org_id,
                location_id,
                storage_space_id,
                item_id,
                requested_by,
                action_type,
                new_quantity,
                previous_quantity,
                notes,
                items ( name, unit_of_measure ),
                storage_spaces ( name ),
                locations ( name ),
                users ( first_name, last_name )
            `)
            .eq('id', requestId)
            .single();

        if (error || !req) {
            console.error('[sendInventoryAdjustmentNotification] fetch error:', error);
            return;
        }

        const recipients = await getRecipients(req.org_id);
        if (recipients.length === 0) {
            console.warn('[sendInventoryAdjustmentNotification] no recipients configured for org', req.org_id);
            return;
        }

        const employeeName =
            [req.users?.first_name, req.users?.last_name].filter(Boolean).join(' ') ||
            'An employee';
        const itemName = (req.items as any)?.name ?? 'Unknown item';
        const itemUnit = (req.items as any)?.unit_of_measure ?? '';
        const locationName = (req.locations as any)?.name ?? '';
        const storageSpaceName = (req.storage_spaces as any)?.name ?? null;

        await sendEmail(req.org_id, 'inventory_adjustment_request', {
            to: recipients,
            subject: `[Laza] ${employeeName} requested an inventory adjustment — ${itemName}`,
            react: React.createElement(InventoryAdjustmentRequest, {
                employeeName,
                itemName,
                itemUnit,
                locationName,
                storageSpaceName,
                actionType: req.action_type as 'count' | 'adjustment' | 'used',
                previousQuantity: req.previous_quantity,
                newQuantity: req.new_quantity,
                notes: req.notes,
                approvalUrl: `${appUrl}/admin/inventory`,
            }),
            metadata: {
                requestId,
                itemId: req.item_id,
                locationId: req.location_id,
            },
        });
    } catch (error) {
        console.error('[sendInventoryAdjustmentNotification] unexpected error:', error);
    }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors from the new service file. If you see `Property 'name' does not exist on type` for the joined relations — the generated Supabase types may not resolve nested select types deeply. The `(req.items as any)?.name` pattern already handles this; no fix needed.

- [ ] **Step 3: Commit**

```bash
git add lib/services/inventoryAdjustmentNotification.ts
git commit -m "feat(b1): add sendInventoryAdjustmentNotification server action"
```

---

## Task 5: Manual smoke test

No automated test runner is configured for these server-side flows. Test manually:

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npm run dev
```

- [ ] **Step 2: Confirm `notification_preferences` has a primary_email for your test org**

In Supabase Studio (or Supabase SQL editor), run:

```sql
SELECT organization_id, primary_email, secondary_emails
FROM notification_preferences
WHERE location_id IS NULL
LIMIT 5;
```

If the row for your test org has an empty `primary_email`, update it to a real address you can check:

```sql
UPDATE notification_preferences
SET primary_email = 'your-email@example.com'
WHERE organization_id = '<your-test-org-id>'
  AND location_id IS NULL;
```

- [ ] **Step 3: Trigger the flow via the employee sheet**

Log in as an employee → open any item → open the quantity update sheet → change the quantity → tap "Submit for Approval". 

Confirm in browser console / server logs that no error appears from `sendInventoryAdjustmentNotification`.

> **Note:** `sendInventoryAdjustmentNotification` is not yet wired to the frontend — that's A6 (Sardor's task). For now, you can test it in isolation via a direct server action call or by temporarily adding it to the existing `onSuccess` in `useCreateInventoryUpdateRequest`:
>
> ```ts
> // Temporary test wiring in lib/hooks/queries/useInventoryUpdateRequests.ts
> onSuccess: async (data) => {
>   await sendInventoryAdjustmentNotification(data.id);
>   queryClient.invalidateQueries({ queryKey: inventoryRequestKeys.all });
> },
> ```
> Remove this temporary wiring after confirming the email arrives. Sardor will add the permanent wiring in A6.

- [ ] **Step 4: Confirm email arrives**

Check the inbox for the `primary_email` configured in `notification_preferences`. Email should arrive within ~30s. Verify:
- Subject: `[Laza] <employee name> requested an inventory adjustment — <item name>`
- Body shows correct previous → new quantity, action type, location, storage space, notes
- "Review in Dashboard" button links to `https://lazadessert.cafe/admin/inventory`

- [ ] **Step 5: Remove temporary test wiring (if added)**

```bash
git diff lib/hooks/queries/useInventoryUpdateRequests.ts
# Revert any temp changes
git checkout lib/hooks/queries/useInventoryUpdateRequests.ts
```

- [ ] **Step 6: Final commit (if any loose ends)**

```bash
git status
# Stage and commit anything remaining
```

---

## Handoff note for A6 (Sardor)

After B1 merges, `createInventoryUpdateRequest` returns `{ id: string }`. In the employee submit handler, after a successful `mutateAsync`, call:

```ts
import { sendInventoryAdjustmentNotification } from '@/lib/services/inventoryAdjustmentNotification';

const result = await requestMutation.mutateAsync({ ... });
// Fire-and-forget — do not await, do not let errors bubble
sendInventoryAdjustmentNotification(result.id).catch(console.error);
```

This satisfies the "email failure does not roll back the adjustment" requirement.
