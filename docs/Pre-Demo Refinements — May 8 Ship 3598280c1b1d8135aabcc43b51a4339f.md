# Pre-Demo Refinements — May 8 Ship

Start date: 05/07/2026
End date: 05/08/2026
Progress: 0%
Priority: High
Assignee: Munis dev, Sardorbek dev
Status: In progress

## Context

End-to-end walkthrough on May 7 surfaced ~10 small refinements before the **5–6 PM EST demo to Abdullah on May 8**. Underlying flows (warehouse → store, fulfill, receive, adjust, approve) are working; this ticket bundles the polish and one minor backend wire-up.

**Hard cutoff:** Sardor and Munis push by **May 8, 5:00 PM EST**. Temur merges + smoke-tests **5:00–6:00 PM EST**, then we demo.

Tracks A and B are independent — neither blocks the other. Temur tasks (T1) unblock Track A item A5. Single consolidated ticket because A6 (Sardor) calls into the server action delivered by B1 (Munis), and they share a hard deadline.

---

## Track A — @Sardorbek dev (Frontend / UX)

### A2. Filter PO screen → warehouse items only

- **Where:** super admin "create purchase order" item picker.
- **Filter:** `items.is_warehouse_item = true`.
- **Why:** super admin only orders warehouse-stocked items; non-warehouse items are sourced directly by stores (per A7).
- **Acceptance:** picker shows zero non-warehouse items. Toggle `is_warehouse_item` in DB on a test item and confirm the picker updates.

### A3. Box quantity validation (modulus + mixed-config sum)

- **Where:** PO creation form, and receive flow.
- **Two cases:**
    1. **Single config** (`purchase_order_items.has_mixed_configs = false`): require `quantity_ordered % pieces_per_box === 0`.
    2. **Mixed configs** (`has_mixed_configs = true`): require `Σ (box_count × pieces_per_box)` across `po_item_box_configs` rows to equal `quantity_ordered`.
- **UX on failure:** red border on the offending input + inline message:
    
    > Boxes must divide evenly. 2,000 ÷ 600 = 3.33, which isn't a whole box.
    > 
- **Tooltip:** "If your supplier invoice shows a decimal box count, it's likely a rounding error on their end." (Per Abubeckr's call note — supplier invoice we reviewed had 5,000 ÷ 83 = 60.24, which is supplier math error, not a real partial box.)
- **Acceptance:** entering an invalid combination blocks submit; valid combinations submit normally.

### A4. Super admin route access

- **Where:** middleware (likely `middleware.ts` at app root).
- **Current behavior:** super admin gets force-redirected away from `/home` (the public marketing site).
- **Required behavior:**
    - ✅ Super admin **can** access the public marketing site (`/`, `/home`, and other public marketing routes).
    - ✅ Super admin **can** access the super admin dashboard (existing behavior).
    - ❌ Super admin **cannot** access `/admin/*` (the store admin CRM). If they try, redirect to the super admin dashboard.
- **Pattern:** role-based gating per route group, not a blanket redirect.
- **Acceptance:**
    - Logged in as super admin → public site loads, super admin dashboard loads, `/admin/*` redirects to super admin dashboard.
    - Logged in as store admin → admin CRM loads, super admin routes still 403/redirect.

### A5. Map pin auto-drop on entered address

> Blocked on T1 (API key)
> 
- **Where:** "create store" form, address input.
- **Behavior:** when address is entered, geocode and drop pin on result. User can still adjust manually after.
- **Critical:** fire on **blur or explicit confirm**, not per-keystroke. Per-keystroke geocoding burns API quota and produces flicker.
- **Acceptance:** type "1234 Main St, Brooklyn NY" → blur the input → pin lands within ~50m of geocoded location.

### A6. Email on inventory-adjustment request (frontend hook)

- **Where:** employee "submit adjustment" button on storage-space detail drawer.
- **Behavior:** on successful INSERT into `inventory_update_requests`, call the new server action delivered by Munis (B1) that sends the admin email. Pass the new request ID — server action does the lookup and send.
- **Failure:** if the email call fails, do **not** roll back the adjustment. The request row is the source of truth; email is a notification on top.
- **Acceptance:** employee submits adjustment → store admin receives email within ~30s pointing to the dashboard URL where they can approve/reject.

### A7. Filter store admin purchases → non-warehouse items only

- **Where:** store admin "create own purchase" item picker.
- **Filter:** `items.is_warehouse_item = false`.
- Mirror of A2 but inverted.

### A8. Move both history graphs into items catalog

- **Where:** items catalog → item detail drawer (super admin only).
- **Add two graphs as stacked sections (price history on top, cost history below):**
    - **Price history** — line graph from `warehouse_transfer_price_history` (the price stores pay).
    - **Cost history** — line graph from `item_cost_history` (landed cost across shipments).
- **No new data work.** Both tables are populated. Pure frontend lift — move the existing graphs into the items catalog tab.
- **Acceptance:** open any item with ≥2 historical entries → both graphs render with axis labels and at least 2 data points each.

---

## Track B — @Munis dev (Backend / Email)

### B1. Resend send for inventory-adjustment requests

- **Trigger:** new row in `inventory_update_requests` with `status = 'pending'`.
- **Pattern:** **inline server action** invoked from frontend on submit. Per the call decision: not a DB trigger, not an Edge Function, not a queue worker. Reuse the existing Resend client (same one used for store-invitation emails — Sardor confirmed those work).
- **Recipient:** store admin(s) of the org that owns `inventory_update_requests.location_id`. Resolve via the org_id on the request row.
- **Email contents (minimum):**
    - **Subject:** `[Laza] {employee_name} requested an inventory adjustment — {item_name}`
    - **Body:** who, item, location/storage space, previous → new quantity, action_type, notes, deep link to approval page.
- **Failure handling:** swallow Resend errors silently in v1 (log to console + Sentry if wired). Do **not** block the adjustment from being recorded.
- **Acceptance:** insert a test row in `inventory_update_requests` with `status='pending'` → admin email arrives within 30s with all fields populated.

### B2. Verify price-lock is at submission, not page-load

> Verification only — likely no code change needed
> 
- **Context:** the trigger `trg_snapshot_transfer_prices_on_submit` already exists on `order_tickets` and is the source of truth for locked prices. Sardor on the call referred to prices being "locked at page load" — that wording was about the client display, not the actual lock. This task is to confirm the client matches the trigger.
- **What to check in code:** the order-submit handler does NOT pass a client-supplied `unit_price` into the INSERT. The trigger snapshots prices server-side at submit. Client display at page load is for hint only.
- **Acceptance test:**
    1. Open the order form (price A shows).
    2. In a second tab, super admin updates the warehouse transfer price to B.
    3. Submit the original order from tab 1.
    4. Verify the row written to `order_ticket_items` (or the snapshot table the trigger writes to) stores **B**, not A.
- **If test fails:** the trigger is being shadowed by client-supplied price. Open a follow-up bug; do **not** block the demo.

### B3. (Optional, only if B1 finishes early) Notification preferences guard

- Before sending in B1, check `notification_preferences` for the recipient and skip if they've muted "inventory adjustment" notifications.
- This is the seed for the digest/throttling work flagged as a scalability risk for 10+ stores. Skip if running tight.

---

## Owner Track — @Temurbek Sayfutdinov

### T1. Provide working Google Maps API key

- Generate from existing GCP project. Restrict to **Geocoding API** + **Maps JavaScript API** only. Add HTTP referrer restriction for the production and staging domains. Set a daily quota cap to prevent runaway billing.
- **Drop in env:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- **Unblocks A5.**

### T2. Smoke-test merge window — May 8, 5:00 PM EST

- Pull both tracks. Run the rollout sequence below. Demo at 5:00–6:00 PM EST.

---

## Cross-Track Rollout Order

1. **T1** (API key) lands first → unblocks A5.
2. **B1** (Resend send) lands → enables A6 to actually send mail.
3. **Track A** (A1–A8) can land in any order. A5 and A6 only test green after T1/B1 land.
4. **B2** runs as a verification step, not a code change unless test fails.

---

## Acceptance Matrix by Role

| Role | Must see / be able to do after merge |
| --- | --- |
| **Super admin** | PO picker shows warehouse items only (A2). Items catalog shows both price + cost history graphs (A8). Can navigate public marketing site AND super admin dashboard, but NOT `/admin/*` (A4). Map pin drops on store address (A5). |
| **Store admin** | Receives email within ~30s of any employee adjustment request (A6/B1). Own-purchases picker shows non-warehouse items only (A7). |
| **Employee** | Submitting an adjustment triggers the email behind the scenes — no UX change for them. |

---

## Required Test Flows (2)

1. **End-to-end PO with mixed-config validation (A3):** create a PO for 2,000 units with one config of 600/box → expect red border, blocked submit. Add a second config of 200/box × 1 → 600×3 + 200×1 = 2,000 → expect green, submit succeeds. Repeat in receive flow.
2. **Adjustment-to-email round trip (A6 + B1):** log in as employee on phone, decrement an item by 5 with reason `damaged`, submit. Confirm admin email arrives, click the link, approve. Confirm inventory decrements.

## Optional Test Flows (3)

1. **Super admin route access (A4):** logged in as super admin, hit `/`, `/admin`, `/super-admin`. Public and super-admin load; `/admin/*` redirects to super admin dashboard.
2. **Map pin drop (A5):** create new store with a real Brooklyn address, confirm pin lands on the building.
3. **Catalog graphs (A8):** pick an item with 3+ shipments and 2+ price changes, confirm both graphs render.

---

## What NOT to Do

- **Do not** rebuild the price-lock mechanism. The trigger `trg_snapshot_transfer_prices_on_submit` is the source of truth. B2 is a verification, not a re-implementation.
- **Do not** turn B1 into an Edge Function or a `pg_cron` job. Inline server action only — that was the call decision.
- **Do not** allow decimal `box_count` values to bypass A3 with a "warning". Hard block.
- **Do not** geocode on every keystroke in A5. Fire on blur or explicit confirm — otherwise we burn quota.
- **Do not** add a margin-breakdown UI in this ticket. That was explicitly deferred — keep the simple line-total minus line-cost display.
- **Do not** allow super admin into `/admin/*` (A4). Super admin's surfaces are the public marketing site and the super admin dashboard only.
- **Do not** open new tickets for the scalability flags below. They live in the post-launch backlog.

---

## Deferred / Post-Launch Backlog

Captured here so they don't vanish:

- **Adjustment-email volume.** Fine at 2 stores; at 10–20 with active employees this becomes spam. Future: daily digest, or only email when adjustment exceeds a percentage threshold or specific reason codes.
- **Box-config dropdown growth.** As configs accumulate per item, the picker gets long. Future: default-config-per-item plus "use custom" override.
- **Margin breakdown UI.** Abdullah explicitly fine with simple display now. If asked later, the underlying data exists in `order_ticket_logs`, `pallet_inventory`, and `item_cost_history` to reconstruct.

---

## Open Questions

1. **A1:** does Temur's US-locale browser also show DD/MM/YYYY? If no, A1 closes without code change.
2. **A4 scope:** which routes count as "public marketing site" for super admin allowlist? Confirm with Temur (`/`, `/home`, anything else like `/about`, `/menu`, `/pricing`?).
3. **B2:** does the price-lock test pass on first run? If yes, close. If no, file a P0 follow-up.