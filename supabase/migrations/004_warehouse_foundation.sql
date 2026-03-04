
-- TASK 1.1 — Add location_type to locations table
-- Purpose: Distinguish between store locations and the centralized
--          warehouse. All existing locations default to 'store'.


ALTER TABLE locations
    ADD COLUMN location_type TEXT NOT NULL DEFAULT 'store';

ALTER TABLE locations
    ADD CONSTRAINT locations_type_check
        CHECK (location_type IN ('store', 'warehouse'));

CREATE INDEX idx_locations_type
    ON locations (location_type);



-- TASK 1.2 — Add box_quantity and cost_per_unit to items table
-- Purpose: box_quantity drives order validation (orders in whole
--          boxes). cost_per_unit enables payment hold calculation.


ALTER TABLE items
    ADD COLUMN box_quantity INTEGER NULL;

ALTER TABLE items
    ADD CONSTRAINT items_box_qty_check
        CHECK (box_quantity IS NULL OR box_quantity > 0);

ALTER TABLE items
    ADD COLUMN cost_per_unit NUMERIC(10,2) NULL;

ALTER TABLE items
    ADD CONSTRAINT items_cost_per_unit_check
        CHECK (cost_per_unit IS NULL OR cost_per_unit >= 0);





-- TASK 1.4 — Create order_tickets table
-- Purpose: Central table for every order a store places against
--          the warehouse. Tracks full lifecycle from draft to
--          confirmed. Self-references for split/remainder tickets.


CREATE TABLE order_tickets (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   organization_id TEXT NOT NULL REFERENCES organizations(id),
   requesting_location_id UUID NOT NULL REFERENCES locations(id),
   warehouse_location_id UUID NOT NULL REFERENCES locations(id),
   status TEXT NOT NULL DEFAULT 'draft',
   requested_by TEXT NOT NULL REFERENCES users(id),
   processed_by TEXT REFERENCES users(id),
   confirmed_by TEXT REFERENCES users(id),
   rejection_reason TEXT,
   parent_ticket_id UUID REFERENCES order_tickets(id),
   is_auto_approved BOOLEAN NOT NULL DEFAULT false,
   notes TEXT,
   submitted_at TIMESTAMPTZ,
   fulfilled_at TIMESTAMPTZ,
   confirmed_at TIMESTAMPTZ,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

   CONSTRAINT order_tickets_status_check
       CHECK (status IN (
         'draft',
         'submitted',
         'processing',
         'fulfilled',
         'confirmed',
         'rejected',
         'cancelled'
           )),

   CONSTRAINT rejection_reason_required
       CHECK (status != 'rejected' OR rejection_reason IS NOT NULL)
    );

CREATE TRIGGER update_order_tickets_updated_at
    BEFORE UPDATE ON order_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_order_tickets_org_status
    ON order_tickets (organization_id, status);

CREATE INDEX idx_order_tickets_requesting_location
    ON order_tickets (requesting_location_id);



-- TASK 1.5 — Create order_ticket_items table
-- Purpose: Line items for each order ticket. One row per item
--          per ticket. Tracks both requested and fulfilled
--          quantities (may differ on partial fulfillment).


CREATE TABLE order_ticket_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES order_tickets(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity_boxes INTEGER NOT NULL,
    quantity_units NUMERIC(10,2) NOT NULL,
    fulfilled_boxes INTEGER,
    fulfilled_units NUMERIC(10,2),

    CONSTRAINT order_ticket_items_quantity_boxes_check
        CHECK (quantity_boxes > 0),

    CONSTRAINT order_ticket_items_unique_item_per_ticket
        UNIQUE (ticket_id, item_id)
);



-- TASK 1.6 — Create order_ticket_logs table
-- Purpose: Immutable audit trail for every status change on a
--          ticket. Insert-only — rows are never updated.
--          Same concept as inventory_logs but for tickets.


CREATE TABLE order_ticket_logs (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   ticket_id UUID NOT NULL REFERENCES order_tickets(id) ON DELETE CASCADE,
   previous_status TEXT,
   new_status TEXT NOT NULL,
   changed_by TEXT NOT NULL REFERENCES users(id),
   notes TEXT,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_ticket_logs_ticket_id
    ON order_ticket_logs (ticket_id);



-- TASK 1.16 — Create payment_holds table
-- Purpose: Tracks payment holds placed when a store submits an
--          order. Hold placed on submit, captured on confirm,
--          released on reject/cancel. Decouples payment state
--          from order state.


CREATE TABLE payment_holds (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   organization_id TEXT NOT NULL REFERENCES organizations(id),
   ticket_id UUID NOT NULL REFERENCES order_tickets(id) ON DELETE CASCADE,
   amount_cents BIGINT NOT NULL,
   currency TEXT NOT NULL DEFAULT 'USD',
   provider_hold_id TEXT,
   status TEXT NOT NULL DEFAULT 'pending',
   captured_amount_cents BIGINT,
   failure_reason TEXT,
   held_at TIMESTAMPTZ,
   captured_at TIMESTAMPTZ,
   released_at TIMESTAMPTZ,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

   CONSTRAINT payment_holds_status_check
       CHECK (status IN ('pending', 'held', 'captured', 'released', 'failed')),

   CONSTRAINT payment_holds_amount_positive
       CHECK (amount_cents > 0),

   CONSTRAINT payment_holds_captured_amount_positive
       CHECK (captured_amount_cents IS NULL OR captured_amount_cents >= 0)
);

CREATE TRIGGER update_payment_holds_updated_at
    BEFORE UPDATE ON payment_holds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_payment_holds_org_id
    ON payment_holds (organization_id);

CREATE INDEX idx_payment_holds_ticket_id
    ON payment_holds (ticket_id);