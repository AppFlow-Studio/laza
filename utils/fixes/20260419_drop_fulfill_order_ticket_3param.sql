-- FIX-A3: Drop obsolete 3-param overload of fulfill_order_ticket.
--
-- Two overloads existed on staging:
--   A) fulfill_order_ticket(uuid, text, text DEFAULT 'company')  ← obsolete
--   B) fulfill_order_ticket(uuid, text, boolean, text)           ← active (4-param)
--
-- The app calls overload B exclusively (see lib/hooks/queries/useOrderTickets.ts).
-- Overload A was the original pre-partial-fulfillment signature; it is unreachable
-- from any current client code and must be dropped to avoid ambiguous-overload
-- errors as Postgres resolves calls at planning time.

DROP FUNCTION IF EXISTS public.fulfill_order_ticket(uuid, text, text);
