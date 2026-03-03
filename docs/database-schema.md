# Database Schema

## Tables

### organizations

Top-level entities representing cafe chains.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | TEXT | NO | Primary key |
| name | TEXT | NO | Organization name |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |
| updated_at | TIMESTAMPTZ | NO | Auto-updated via trigger |

### locations

Individual cafe locations within an organization.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | Primary key, auto-generated |
| organization_id | UUID | NO | FK -> organizations(id) CASCADE |
| name | TEXT | NO | Location name |
| address | JSONB | NO | `{street, city, state, zip, country?}` |
| is_active | BOOLEAN | NO | Default `true` |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |
| updated_at | TIMESTAMPTZ | NO | Auto-updated via trigger |

### storage_spaces

Temperature-controlled storage areas within locations.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | Primary key, auto-generated |
| location_id | UUID | NO | FK -> locations(id) CASCADE |
| name | TEXT | NO | Storage space name |
| temperature_type | TEXT | NO | `'frozen'`, `'refrigerated'`, or `'dry'` |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |
| updated_at | TIMESTAMPTZ | NO | Auto-updated via trigger |

### category

Item categories for organizing inventory.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | BIGINT | NO | Primary key |
| organization_id | UUID | NO | FK -> organizations(id) CASCADE |
| name | TEXT | NO | Category name |
| description | TEXT | YES | Optional description |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |
| updated_at | TIMESTAMPTZ | NO | Auto-updated via trigger |

### items

Inventory items (desserts, ingredients, supplies).

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | BIGINT | NO | Primary key |
| organization_id | UUID | NO | FK -> organizations(id) CASCADE |
| name | TEXT | NO | Item name |
| sku | TEXT | YES | Unique SKU identifier |
| category_id | BIGINT | YES | FK -> category(id) CASCADE |
| unit_of_measure | TEXT | NO | `'pcs'`, `'kg'`, `'liters'`, `'lbs'`, `'oz'` |
| min_quantity | NUMERIC(10,2) | NO | Default 0, organization-wide minimum |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |
| updated_at | TIMESTAMPTZ | NO | Auto-updated via trigger |

### item_locations

Junction table linking items to locations with quantity tracking.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | Primary key, auto-generated |
| item_id | BIGINT | NO | FK -> items(id) CASCADE |
| location_id | UUID | NO | FK -> locations(id) CASCADE |
| storage_space_id | UUID | YES | FK -> storage_spaces(id) SET NULL |
| current_quantity | NUMERIC(10,2) | NO | Default 0 |
| min_quantity_override | NUMERIC(10,2) | YES | Location-specific minimum (overrides item default) |
| last_updated | TIMESTAMPTZ | NO | Default `NOW()` |

**Constraints**: UNIQUE(item_id, location_id, storage_space_id)
**Triggers**: `check_low_stock_trigger` — fires after insert/update on `current_quantity` or `min_quantity_override` to auto-create/resolve alerts.

### users

Application users with role-based access.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | TEXT | NO | Primary key (from Clerk) |
| email | TEXT | NO | User email |
| role | TEXT | YES | `'admin'` or `'employee'` |
| assigned_location_id | UUID | YES | FK -> locations(id) SET NULL |
| first_name | TEXT | YES | |
| last_name | TEXT | YES | |
| is_active | BOOLEAN | NO | Default `true` |
| avatar_url | TEXT | YES | Profile avatar URL |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |
| updated_at | TIMESTAMPTZ | NO | Default `NOW()` |

### inventory_logs

Audit trail for all inventory changes.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | Primary key, auto-generated |
| item_id | BIGINT | NO | FK -> items(id) CASCADE |
| location_id | UUID | NO | FK -> locations(id) CASCADE |
| storage_space_id | UUID | YES | FK -> storage_spaces(id) SET NULL |
| user_id | TEXT | YES | FK -> users(id) SET NULL |
| previous_quantity | NUMERIC(10,2) | NO | Quantity before change |
| new_quantity | NUMERIC(10,2) | NO | Quantity after change |
| quantity_change | NUMERIC(10,2) | NO | Delta (new - previous) |
| action_type | TEXT | NO | `'count'`, `'adjustment'`, `'received'`, `'used'` |
| notes | TEXT | YES | Optional notes |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |

### alerts

Low-stock and other inventory alerts.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | BIGINT | NO | Primary key |
| item_id | BIGINT | NO | FK -> items(id) CASCADE |
| location_id | UUID | NO | FK -> locations(id) CASCADE |
| storage_space_id | UUID | YES | FK -> storage_spaces(id) SET NULL |
| alert_type | TEXT | NO | `'low_stock'` |
| triggered_at | TIMESTAMPTZ | NO | Default `NOW()` |
| resolved_at | TIMESTAMPTZ | YES | NULL until resolved |
| notified_users | JSONB | NO | Default `'[]'` |

**Unique Constraint**: `(item_id, location_id, storage_space_id, alert_type)` WHERE `resolved_at IS NULL AND storage_space_id IS NOT NULL` — prevents duplicate active alerts.

### org_invites

Tracks organization invitations from Clerk.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | Primary key, auto-generated |
| clerk_invite_id | TEXT | NO | Unique Clerk invite ID |
| organization_id | TEXT | NO | Clerk organization ID |
| email | TEXT | NO | Invited email |
| status | TEXT | NO | `'pending'`, `'accepted'`, `'expired'`, `'cancelled'` |
| role | TEXT | NO | `'admin'` or `'employee'` |
| clerk_user_id | TEXT | YES | Populated on acceptance |
| assigned_location_id | UUID | YES | FK -> locations(id) SET NULL |
| accepted_at | TIMESTAMPTZ | YES | |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |
| updated_at | TIMESTAMPTZ | NO | Auto-updated via trigger |

### update_limits

Rate limiting configuration for inventory updates.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | Primary key, auto-generated |
| location_id | UUID | NO | FK -> locations(id) CASCADE |
| storage_space_id | UUID | YES | FK -> storage_spaces(id) CASCADE. NULL = location-wide default |
| max_updates_per_window | INTEGER | NO | Default 2 |
| time_window_start | TIME | NO | Default `'00:00:00'` |
| time_window_end | TIME | NO | Default `'23:59:59'` |
| is_active | BOOLEAN | NO | Default `true` |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |
| updated_at | TIMESTAMPTZ | NO | Auto-updated via trigger |

**Constraints**: UNIQUE(location_id, storage_space_id)

### update_override_logs

Tracks admin overrides of employee update limits.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | Primary key, auto-generated |
| inventory_log_id | UUID | NO | FK -> inventory_logs(id) CASCADE |
| item_id | UUID | NO | FK -> items(id) CASCADE |
| location_id | UUID | NO | FK -> locations(id) CASCADE |
| storage_space_id | UUID | YES | FK -> storage_spaces(id) SET NULL |
| admin_user_id | TEXT | NO | FK -> users(id) CASCADE |
| employee_user_id | TEXT | YES | FK -> users(id) SET NULL |
| override_reason | TEXT | YES | |
| created_at | TIMESTAMPTZ | NO | Default `NOW()` |

## Enums

| Name | Values |
|------|--------|
| temperature_type | `frozen`, `refrigerated`, `dry` |
| unit_of_measure | `pcs`, `kg`, `liters`, `lbs`, `oz` |
| role | `admin`, `employee` |
| action_type | `count`, `adjustment`, `received`, `used` |
| alert_type | `low_stock` |
| invite_status | `pending`, `accepted`, `expired`, `cancelled` |

## Database Functions

| Function | Purpose |
|----------|---------|
| `update_updated_at_column()` | Trigger function that auto-updates `updated_at` |
| `check_low_stock()` | Creates/resolves alerts when `item_locations` quantities change |
| `get_time_window_bounds()` | Calculates time window bounds for update limits |
| `is_within_time_window()` | Checks if a timestamp falls within a configured window |
| `get_update_count_in_window()` | Counts employee updates for an item in the current window |

## Row-Level Security

All tables have RLS enabled:

- **Admins**: Full CRUD access to all tables
- **Employees**: Read access to assigned location data, update access to `item_locations` for assigned location, insert access to `inventory_logs`
- **Service Role**: Full access (used by webhooks and edge functions)

## Entity Relationships

```
organizations (1) --- (n) locations
organizations (1) --- (n) items
organizations (1) --- (n) category

locations (1) --- (n) storage_spaces
locations (1) --- (n) item_locations
locations (1) --- (n) inventory_logs
locations (1) --- (n) alerts
locations (1) --- (n) update_limits

storage_spaces (1) --- (n) item_locations
storage_spaces (1) --- (n) inventory_logs
storage_spaces (1) --- (n) alerts

items (1) --- (n) item_locations
items (1) --- (n) inventory_logs
items (1) --- (n) alerts
items (n) --- (1) category

users (1) --- (n) inventory_logs
users (1) --- (n) update_override_logs
users (n) --- (1) locations (assigned_location)
```

## Source Files

- `lib/supabase/types.ts` — TypeScript type definitions
- `supabase/migrations/001_admin_schema.sql` — Core schema
- `supabase/migrations/002_org_invites.sql` — Org invites table
- `supabase/migrations/002_add_storage_space_to_alerts.sql` — Storage space alert enhancements
- `supabase/migrations/003_update_limits_system.sql` — Update limits and override logs
