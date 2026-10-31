# Notifications

Laza uses Resend for transactional email delivery with React Email templates. The notification system supports immediate alerts, batched digests, and scheduled daily summaries.

## Notification Preferences

Organization-level settings stored in the database, configurable via Admin Settings.

| Setting | Purpose |
|---------|---------|
| `notifications_enabled` | Global kill switch for all notifications |
| `low_stock_alerts_enabled` | Enable/disable low stock alerts |
| `delivery_mode` | `'immediate'`, `'digest'`, or `'both'` |
| `quiet_hours_start` / `quiet_hours_end` | Time window when emails are suppressed |
| `primary_email` / `secondary_emails` | Notification recipients |
| `timezone` | Organization timezone for formatting |

## Low Stock Alert Flow

### Immediate Alerts

Triggered when an item drops below its minimum threshold.

```
DB trigger detects low stock
        |
        v
sendLowStockAlert() — lib/services/emailNotifications.ts
  1. Check notification preferences (enabled? quiet hours?)
  2. Calculate urgency level (low / critical / out_of_stock)
  3. Fetch item, location, storage space context
        |
        v
Edge function: send-low-stock-alert
  1. Build HTML email with urgency indicator
  2. Include quantity stats, item details, action links
  3. Send via Resend API
  4. Log delivery in email_delivery_logs
```

### Digest Alerts

Batches multiple low stock items into a single email.

```
queueLowStockAlert() — adds to low_stock_notification_queue
        |
        v (scheduled or manual trigger)
        |
sendLowStockDigest() — lib/services/emailNotifications.ts
        |
        v
Edge function: send-low-stock-digest
  1. Fetch pending items via RPC (get_pending_digest_items)
  2. Group items by location
  3. Count critical vs low stock items
  4. Build summary email
  5. Send via Resend
  6. Mark items as processed (mark_digest_items_processed)
  7. Log delivery
```

## Daily Summary

Comprehensive daily inventory report sent on a schedule.

```
Edge function: send-daily-summary
  Payload: { organization_id, date?, location_id? }
```

**Included sections:**

| Section | Content |
|---------|---------|
| Updated Items | All inventory changes for the day (item, previous/new qty, who, when) |
| Low Stock Items | Current items below threshold with urgency levels |
| Employee Activity | Who made updates, count, action types |
| Storage Utilization | Per-item breakdown across storage spaces |
| Comparison Metrics | Today vs yesterday, week over week trends |
| Trending Items | Most active items with direction (up/down/neutral) |

**Features:**
- Multi-location support with section headers
- Timezone-aware formatting
- Links to admin dashboard and settings

## Email Templates

Located in `email/`.

### Internal Templates (Inventory Management)

| Template | File | Purpose |
|----------|------|---------|
| Low Stock Alert | `LowStockAlert.tsx` | Single-item alert with urgency level, quantities, item details |
| Low Stock Digest | `LowStockDigest.tsx` | Batched alert summary grouped by location/category |
| Daily Location Summary | `DailyLocationSummary.tsx` | Daily report with metrics, comparisons, trending items |

### Public Templates (Customer-Facing)

| Template | File | Purpose |
|----------|------|---------|
| Order Confirmation | `LazaOrderConfirmation.tsx` | Itemized order receipt with tax calculation |
| Welcome Email | `LazaWelcomeEmail.tsx` | New customer welcome with 15% off code (WELCOME15) |
| Promotional Email | `LazaPromotionalEmail.tsx` | Dynamic marketing campaigns with featured items |
| Catering Confirmation | `LazaCateringConfirmation.tsx` | Catering inquiry receipt with 3-step process |
| Franchise Waitlist Confirmation | `LazaFranchiseWaitlistConfirmation.tsx` | Waitlist signup confirmation |
| Franchise Waitlist Notification | `LazaFranchiseWaitlistNotification.tsx` | Admin notification of new waitlist signup |
| Franchise Inquiry | `LazaFranchiseInquiry.tsx` | Detailed franchise application with 9 sections |

### Email Sending Functions

Exported from `email/index.ts`:

| Function | Sends To |
|----------|----------|
| `SendCateringConfirmationEmail()` | Customer + support team |
| `SendFranchiseInquiryEmail()` | Admin/support team |
| `SendFranchiseWaitlistEmails()` | Customer confirmation + support notification |

## Edge Functions

Located in `supabase/functions/`.

| Function | Trigger | Purpose |
|----------|---------|---------|
| `clerk-webhooks` | Clerk webhook events | Sync users, orgs, memberships, invites to Supabase (dev) |
| `clerk-webhooks-prod` | Clerk webhook events | Same as above with enhanced membership sync (prod) |
| `send-low-stock-alert` | Alert created | Send immediate low stock email |
| `send-low-stock-digest` | Scheduled / manual | Send batched low stock digest |
| `send-daily-summary` | Scheduled / manual | Send daily inventory summary report |

## Email Delivery Logging

All email sends are logged in `email_delivery_logs`:

| Field | Purpose |
|-------|---------|
| `organization_id` | Which org |
| `email_type` | Template type |
| `recipient` | Email address |
| `status` | `'sent'`, `'failed'`, `'pending'` |
| `error` | Error message if failed |
| `resend_email_id` | Resend tracking ID |
| `metadata` | Additional context (item count, urgency, etc.) |

Viewable in Admin Settings > Logs tab with filters for email type, status, date range, and recipient.

Failed emails can be queried via `getFailedEmails()` for retry logic.

## Server Actions

Located in `app/actions/process-notifications.ts`:

| Action | Purpose |
|--------|---------|
| `processLowStockNotifications(orgId)` | Process queued alerts based on delivery mode |
| `processLowStockDigest(orgId)` | Trigger digest email send |
