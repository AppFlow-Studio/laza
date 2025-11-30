# Email Notification System - Implementation Plan

## Overview

Implement a comprehensive email notification system for organization admins with customizable preferences for low stock alerts and daily location summaries. The system will use Resend (already configured) and React Email templates.

---

## Part 1: Database Schema

### 1.1 Create `notification_preferences` Table
- **File**: `supabase/migrations/004_email_notifications.sql`
- Store admin notification preferences per organization
- Fields:
  - `id` (UUID, primary key)
  - `organization_id` (UUID, references organizations)
  - `primary_email` (TEXT, required)
  - `secondary_emails` (JSONB, array of email strings)
  - `timezone` (TEXT, default 'America/New_York')
  - `notifications_enabled` (BOOLEAN, default true)
  - `low_stock_alerts_enabled` (BOOLEAN, default true)
  - `daily_summary_enabled` (BOOLEAN, default true)
  - `low_stock_delivery_mode` (TEXT, enum: 'immediate', 'digest', 'both', default 'immediate')
  - `low_stock_digest_schedule` (TIME, nullable, e.g., '08:00:00')
  - `daily_summary_schedule` (TIME, default '08:00:00')
  - `daily_summary_days` (JSONB, array of day numbers 0-6, default [1,2,3,4,5] for weekdays)
  - `quiet_hours_start` (TIME, nullable)
  - `quiet_hours_end` (TIME, nullable)
  - `email_format` (TEXT, enum: 'html', 'plain', default 'html')
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- Unique constraint on `organization_id`
- Index on `organization_id`

### 1.2 Create `low_stock_thresholds` Table
- Store custom thresholds per item or category
- Fields:
  - `id` (UUID, primary key)
  - `organization_id` (UUID, references organizations)
  - `item_id` (UUID, nullable, references items)
  - `category_id` (UUID, nullable, references category)
  - `location_id` (UUID, nullable, references locations)
  - `low_threshold` (NUMERIC, required)
  - `critical_threshold` (NUMERIC, nullable, typically 50% of low_threshold)
  - `is_active` (BOOLEAN, default true)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- Check constraint: either item_id OR category_id must be set, not both
- Indexes on `organization_id`, `item_id`, `category_id`, `location_id`

### 1.3 Create `daily_summary_preferences` Table
- Store detailed preferences for daily summary content
- Fields:
  - `id` (UUID, primary key)
  - `organization_id` (UUID, references organizations)
  - `include_inventory_value` (BOOLEAN, default true)
  - `include_updated_items` (BOOLEAN, default true)
  - `include_storage_utilization` (BOOLEAN, default true)
  - `include_low_stock_items` (BOOLEAN, default true)
  - `include_employee_activity` (BOOLEAN, default true)
  - `include_comparison_metrics` (BOOLEAN, default true)
  - `include_trending_items` (BOOLEAN, default false)
  - `min_significance_threshold` (INTEGER, default 10, minimum unit change to show)
  - `summary_format` (TEXT, enum: 'detailed', 'concise', default 'detailed')
  - `group_by_location` (BOOLEAN, default false, if true, send separate emails per location)
  - `locations_to_include` (JSONB, array of location UUIDs, empty means all)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- Unique constraint on `organization_id`
- Index on `organization_id`

### 1.4 Create `email_delivery_logs` Table
- Track all emails sent for audit and debugging
- Fields:
  - `id` (UUID, primary key)
  - `organization_id` (UUID, references organizations)
  - `email_type` (TEXT, enum: 'low_stock_alert', 'low_stock_digest', 'daily_summary')
  - `recipient_email` (TEXT, required)
  - `subject` (TEXT, required)
  - `resend_email_id` (TEXT, nullable, Resend email ID)
  - `status` (TEXT, enum: 'sent', 'failed', 'pending', default 'pending')
  - `error_message` (TEXT, nullable)
  - `metadata` (JSONB, nullable, stores context like item_ids, location_ids, etc.)
  - `sent_at` (TIMESTAMPTZ, nullable)
  - `created_at` (TIMESTAMPTZ)
- Indexes on `organization_id`, `email_type`, `status`, `created_at`, `recipient_email`

### 1.5 Create `low_stock_notification_queue` Table
- Queue low stock alerts for batch processing (digest mode)
- Fields:
  - `id` (UUID, primary key)
  - `organization_id` (UUID, references organizations)
  - `alert_id` (UUID, references alerts)
  - `item_id` (UUID, references items)
  - `location_id` (UUID, references locations)
  - `storage_space_id` (UUID, nullable, references storage_spaces)
  - `urgency_level` (TEXT, enum: 'low', 'critical', 'out_of_stock')
  - `queued_at` (TIMESTAMPTZ, default NOW())
  - `processed_at` (TIMESTAMPTZ, nullable)
  - `notification_sent` (BOOLEAN, default false)
- Indexes on `organization_id`, `queued_at`, `processed_at`, `notification_sent`
- Partial index on unprocessed items: `WHERE processed_at IS NULL`

---

## Part 2: Server Functions - Notification Preferences

### 2.1 Notification Preferences Queries
- **File**: `lib/supabase/queries/notificationPreferences.ts` (new)
- Functions:
  - `getNotificationPreferences(organizationId)` - Get preferences
  - `createNotificationPreferences(organizationId, data)` - Create preferences
  - `updateNotificationPreferences(organizationId, updates)` - Update preferences
  - `getLowStockThresholds(organizationId, filters?)` - Get thresholds
  - `createLowStockThreshold(data)` - Create threshold
  - `updateLowStockThreshold(id, updates)` - Update threshold
  - `deleteLowStockThreshold(id)` - Delete threshold
  - `getDailySummaryPreferences(organizationId)` - Get summary preferences
  - `updateDailySummaryPreferences(organizationId, updates)` - Update summary preferences

### 2.2 Email Delivery Logging
- **File**: `lib/supabase/queries/emailDelivery.ts` (new)
- Functions:
  - `logEmailDelivery(data)` - Log email sent
  - `getEmailDeliveryLogs(organizationId, filters?)` - Get delivery history
  - `updateEmailDeliveryStatus(id, status, error?)` - Update delivery status

---

## Part 3: Email Templates

### 3.1 Low Stock Alert Email Template
- **File**: `email/LowStockAlert.tsx` (new)
- React Email component
- Display:
  - Item name, SKU, current quantity
  - Location and storage space
  - Threshold information
  - Urgency level (visual indicator)
  - Suggested reorder quantity
  - Link to view item in app
  - Link to update inventory

### 3.2 Low Stock Digest Email Template
- **File**: `email/LowStockDigest.tsx` (new)
- React Email component
- Display:
  - Summary of all low stock items
  - Grouped by location or category (configurable)
  - Urgency indicators
  - Quick action buttons
  - Link to view all alerts in app

### 3.3 Daily Location Summary Email Template
- **File**: `email/DailyLocationSummary.tsx` (new)
- React Email component
- Display sections (based on preferences):
  - Executive summary (key metrics)
  - Inventory value by location
  - Items updated today (with before/after)
  - Storage utilization
  - Low stock items
  - Employee activity summary
  - Comparison metrics (today vs yesterday, week over week)
  - Trending items (fastest/slowest movers)
- Responsive design, mobile-friendly

---

## Part 4: Email Sending Functions

### 4.1 Low Stock Alert Email Service
- **File**: `lib/services/emailNotifications.ts` (new)
- Functions:
  - `sendLowStockAlert(alertId, organizationId)` - Send immediate alert
  - `sendLowStockDigest(organizationId)` - Send digest of queued alerts
  - `queueLowStockAlert(alertId, organizationId)` - Queue for digest
  - `calculateUrgencyLevel(itemId, locationId, currentQuantity, threshold)` - Determine urgency
  - `getSuggestedReorderQuantity(itemId, locationId)` - Calculate suggested reorder

### 4.2 Daily Summary Email Service
- **File**: `lib/services/dailySummary.ts` (new)
- Functions:
  - `generateDailySummary(organizationId, locationId?, date?)` - Generate summary data
  - `sendDailySummary(organizationId, locationId?)` - Send summary email
  - `getInventoryValue(locationId, date)` - Calculate inventory value
  - `getUpdatedItemsToday(locationId, date)` - Get items updated today
  - `getStorageUtilization(locationId)` - Calculate storage space usage
  - `getComparisonMetrics(locationId, date)` - Get day-over-day and week-over-week
  - `getTrendingItems(locationId, date)` - Get fastest/slowest movers

### 4.3 Email Service Helper
- **File**: `lib/services/emailService.ts` (new)
- Centralized email sending with Resend
- Functions:
  - `sendEmail(to, subject, template, metadata?)` - Generic email sender
  - `shouldSendInQuietHours(organizationId, time)` - Check quiet hours
  - `getRecipients(organizationId)` - Get all email recipients

---

## Part 5: Scheduled Jobs / Cron Tasks

### 5.1 Supabase Edge Function for Daily Summary
- **File**: `supabase/functions/daily-summary/index.ts` (new)
- Runs daily at configured times
- Queries all organizations with daily summary enabled
- Generates and sends summaries based on preferences
- Uses Supabase cron or external cron service (Vercel Cron, etc.)

### 5.2 Supabase Edge Function for Low Stock Digest
- **File**: `supabase/functions/low-stock-digest/index.ts` (new)
- Runs at configured digest schedule times
- Processes queued low stock alerts
- Groups by location/category based on preferences
- Sends digest emails

### 5.3 Low Stock Alert Trigger
- **File**: `supabase/migrations/004_email_notifications.sql`
- Database trigger or function that:
  - Detects new low stock alerts
  - Checks notification preferences
  - Queues immediate alerts or adds to digest queue
  - Respects quiet hours

---

## Part 6: React Query Hooks

### 6.1 Notification Preferences Hooks
- **File**: `lib/hooks/queries/useNotificationPreferences.ts` (new)
- Hooks:
  - `useNotificationPreferences(organizationId)` - Get preferences
  - `useUpdateNotificationPreferences()` - Update mutation
  - `useLowStockThresholds(organizationId)` - Get thresholds
  - `useCreateLowStockThreshold()` - Create threshold mutation
  - `useUpdateLowStockThreshold()` - Update threshold mutation
  - `useDeleteLowStockThreshold()` - Delete threshold mutation
  - `useDailySummaryPreferences(organizationId)` - Get summary preferences
  - `useUpdateDailySummaryPreferences()` - Update summary preferences mutation

### 6.2 Email Delivery Hooks
- **File**: `lib/hooks/queries/useEmailDelivery.ts` (new)
- Hooks:
  - `useEmailDeliveryLogs(organizationId, filters?)` - Get delivery logs

---

## Part 7: UI Components - Notification Preferences Dashboard

### 7.1 Main Preferences Page
- **File**: `app/(dashboard)/admin/settings/notifications/page.tsx` (new)
- Main dashboard for notification settings
- Tabs or sections for:
  - General preferences
  - Low stock alerts
  - Daily summary
  - Email delivery logs

### 7.2 General Preferences Component
- **File**: `components/admin/settings/GeneralNotificationPreferences.tsx` (new)
- Form fields:
  - Primary email (from user profile, read-only or editable)
  - Secondary emails (add/remove)
  - Timezone selector
  - Global enable/disable toggle
  - Email format preference

### 7.3 Low Stock Alert Preferences Component
- **File**: `components/admin/settings/LowStockAlertPreferences.tsx` (new)
- Form fields:
  - Enable/disable low stock alerts
  - Delivery mode (immediate, digest, both)
  - Digest schedule time
  - Quiet hours (start/end)
  - Alert grouping preference
  - Default thresholds by category
  - Custom thresholds per item (with table/list)

### 7.4 Low Stock Threshold Manager
- **File**: `components/admin/settings/LowStockThresholdManager.tsx` (new)
- Table/list of thresholds
- Add/edit/delete thresholds
- Filter by category, item, location
- Show active/inactive status
- Bulk operations

### 7.5 Daily Summary Preferences Component
- **File**: `components/admin/settings/DailySummaryPreferences.tsx` (new)
- Form fields:
  - Enable/disable daily summary
  - Delivery schedule (time and days)
  - Content sections toggles (checkboxes for each section)
  - Detail level (detailed vs concise)
  - Minimum significance threshold
  - Group by location toggle
  - Location selector (which locations to include)

### 7.6 Email Delivery Logs Component
- **File**: `components/admin/settings/EmailDeliveryLogs.tsx` (new)
- Table showing:
  - Email type
  - Recipient
  - Subject
  - Status
  - Sent at
  - Error message (if failed)
- Filters by date range, type, status
- Pagination
- Resend failed emails option

---

## Part 8: Integration Points

### 8.1 Integrate with Existing Alert System
- **File**: `supabase/migrations/004_email_notifications.sql`
- Modify or extend `check_low_stock()` trigger function
- When alert is created:
  - Check if notifications enabled for organization
  - Check delivery mode (immediate vs digest)
  - Either send immediately or queue for digest
  - Respect quiet hours

### 8.2 Onboarding Wizard
- **File**: `components/admin/onboarding/NotificationSetupWizard.tsx` (new)
- Simple wizard for first-time setup
- Steps:
  1. Enable notifications (yes/no)
  2. Set primary email
  3. Choose low stock alert preferences
  4. Choose daily summary preferences
  5. Review and save
- Show on first admin login or organization creation

### 8.3 Settings Navigation
- **File**: `app/(dashboard)/admin/layout.tsx`
- Add "Settings" or "Notifications" link to sidebar
- Or add to existing settings page if exists

---

## Part 9: Helper Functions & Utilities

### 9.1 Threshold Calculation
- **File**: `lib/utils/thresholds.ts` (new)
- Functions:
  - `getEffectiveThreshold(itemId, locationId, organizationId)` - Get threshold (custom > category > default)
  - `calculateUrgencyLevel(currentQuantity, lowThreshold, criticalThreshold?)` - Determine urgency
  - `getSuggestedReorderQuantity(itemId, locationId, currentQuantity, threshold)` - Calculate reorder amount

### 9.2 Time Zone Utilities
- **File**: `lib/utils/timezone.ts` (new)
- Functions:
  - `convertToOrganizationTimezone(timestamp, timezone)` - Convert timestamp
  - `isWithinQuietHours(time, startTime, endTime, timezone)` - Check quiet hours
  - `getNextScheduledTime(schedule, timezone)` - Get next run time

### 9.3 Email Template Data Builders
- **File**: `lib/utils/emailDataBuilders.ts` (new)
- Functions to build data objects for email templates:
  - `buildLowStockAlertData(alertId)`
  - `buildLowStockDigestData(organizationId, alerts)`
  - `buildDailySummaryData(organizationId, locationId?, date?)`

---

## Implementation Details

### Email Sending Strategy
- Use Resend API (already configured)
- Store email IDs in `email_delivery_logs` for tracking
- Handle failures gracefully (log, retry logic optional)
- Rate limiting consideration (Resend has limits)

### Scheduled Jobs Options
1. **Supabase Edge Functions with pg_cron** (if available)
2. **Vercel Cron Jobs** (if deployed on Vercel)
3. **External cron service** (cron-job.org, EasyCron, etc.)
4. **Next.js API route with external trigger**

### Low Stock Alert Flow
1. Database trigger detects low stock → creates alert
2. Trigger function checks notification preferences
3. If immediate: send email right away (respect quiet hours)
4. If digest: add to `low_stock_notification_queue`
5. Scheduled job processes queue at digest time
6. Send grouped digest email
7. Mark queue items as processed

### Daily Summary Flow
1. Scheduled job runs at configured time
2. For each organization with daily summary enabled:
   - Get preferences
   - Generate summary data for selected locations
   - Build email template
   - Send email(s) (one per location if `group_by_location` is true)
   - Log delivery

### Threshold Priority
1. Item-specific threshold (highest priority)
2. Category-specific threshold
3. Location-specific threshold
4. Organization default threshold
5. Item's `min_quantity` field (fallback)

---

## File Changes Summary

### New Files
- `supabase/migrations/004_email_notifications.sql`
- `lib/supabase/queries/notificationPreferences.ts`
- `lib/supabase/queries/emailDelivery.ts`
- `lib/services/emailNotifications.ts`
- `lib/services/dailySummary.ts`
- `lib/services/emailService.ts`
- `lib/hooks/queries/useNotificationPreferences.ts`
- `lib/hooks/queries/useEmailDelivery.ts`
- `lib/utils/thresholds.ts`
- `lib/utils/timezone.ts`
- `lib/utils/emailDataBuilders.ts`
- `email/LowStockAlert.tsx`
- `email/LowStockDigest.tsx`
- `email/DailyLocationSummary.tsx`
- `app/(dashboard)/admin/settings/notifications/page.tsx`
- `components/admin/settings/GeneralNotificationPreferences.tsx`
- `components/admin/settings/LowStockAlertPreferences.tsx`
- `components/admin/settings/LowStockThresholdManager.tsx`
- `components/admin/settings/DailySummaryPreferences.tsx`
- `components/admin/settings/EmailDeliveryLogs.tsx`
- `components/admin/onboarding/NotificationSetupWizard.tsx`
- `supabase/functions/daily-summary/index.ts` (optional, if using Edge Functions)
- `supabase/functions/low-stock-digest/index.ts` (optional, if using Edge Functions)

### Modified Files
- `supabase/migrations/002_add_storage_space_to_alerts.sql` - Extend trigger to queue notifications
- `app/(dashboard)/admin/layout.tsx` - Add Settings/Notifications link
- `email/index.ts` - Export new email functions

---

## Success Criteria

- Admins can configure all notification preferences through UI
- Low stock alerts are sent based on preferences (immediate/digest)
- Daily summaries are generated and sent at configured times
- Email delivery is logged for audit purposes
- Thresholds can be set per item, category, or location
- Quiet hours are respected
- Email templates are mobile-friendly and scannable
- Failed emails are logged with error messages
- Onboarding wizard helps new admins set up notifications
- All preferences are organization-scoped

---

## Future Enhancements (Not in Initial Implementation)

- Email open/click tracking
- Unsubscribe/pause functionality
- Weekly/monthly trend reports
- Predictive alerts
- Anomaly detection
- Cost analysis summaries
- Supplier reorder integration
- SMS notifications (alternative channel)

