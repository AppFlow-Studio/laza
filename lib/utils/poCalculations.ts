// lib/utils/poCalculations.ts
//
// Pure functions that replicate the Carton Calculator Excel logic.
// Used by the New PO form AND the PO detail page for live recalculation.
// No side effects — all inputs in, computed values out.
//
// Formula (from Warehouse Cost Tracking Plan §2.1):
//   cbm_share         = item_cbm / total_cbm
//   allocated_office  = cbm_share × office_fee
//   allocated_ship    = cbm_share × shipping_fee
//   total_cost_after  = total_price_before + allocated_office + allocated_ship
//   unit_cost_after   = total_cost_after / quantity_ordered

export interface POLineInput {
    item_id: number;
    quantity_ordered: number;
    unit_price_before: number;
    pieces_per_carton: number | null;
    cbm: number | null; // CBM for this line item
}

export interface POLineCalculated extends POLineInput {
    total_price_before: number;
    cartons: number | null;
    cbm_share: number | null;
    allocated_office_fee: number | null;
    allocated_shipping_fee: number | null;
    total_cost_after: number;
    unit_cost_after: number;
}

export interface POTotals {
    total_cbm: number;
    subtotal_before: number; // sum of total_price_before
    grand_total_after: number; // sum of total_cost_after
}

/**
 * Recalculate all line items given shared fees.
 * Call this on every keystroke in the form (office_fee, shipping_fee, cbm).
 */
export function calculatePOLines(
    lines: POLineInput[],
    officeFee: number,
    shippingFee: number
): { lines: POLineCalculated[]; totals: POTotals } {
    // Step 1: compute per-line base values and sum CBM
    const totalCBM = lines.reduce((sum, l) => sum + (l.cbm ?? 0), 0);

    const calculated: POLineCalculated[] = lines.map((l) => {
        const totalBefore = l.quantity_ordered * l.unit_price_before;
        const cartons =
            l.pieces_per_carton && l.pieces_per_carton > 0
                ? l.quantity_ordered / l.pieces_per_carton
                : null;

        // CBM share and fee allocation — only when totalCBM > 0
        const cbmShare =
            totalCBM > 0 && l.cbm != null ? l.cbm / totalCBM : null;
        const allocOffice = cbmShare != null ? cbmShare * officeFee : null;
        const allocShip = cbmShare != null ? cbmShare * shippingFee : null;

        const totalAfter =
            totalBefore + (allocOffice ?? 0) + (allocShip ?? 0);
        const unitAfter =
            l.quantity_ordered > 0 ? totalAfter / l.quantity_ordered : 0;

        return {
            ...l,
            total_price_before: totalBefore,
            cartons,
            cbm_share: cbmShare,
            allocated_office_fee: allocOffice,
            allocated_shipping_fee: allocShip,
            total_cost_after: totalAfter,
            unit_cost_after: unitAfter,
        };
    });

    const totals: POTotals = {
        total_cbm: totalCBM,
        subtotal_before: calculated.reduce(
            (s, l) => s + l.total_price_before,
            0
        ),
        grand_total_after: calculated.reduce(
            (s, l) => s + l.total_cost_after,
            0
        ),
    };

    return { lines: calculated, totals };
}

/** Format a number as USD with 4 decimal places (unit costs need precision) */
export function fmtUnitCost(n: number): string {
    return `$${n.toFixed(2)}`;
}

/** Format a number as USD with 2 decimal places (totals, fees) */
export function fmtMoney(n: number): string {
    return `$${n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}