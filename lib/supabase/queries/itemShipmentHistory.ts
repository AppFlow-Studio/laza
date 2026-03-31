"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ShipmentBoxConfig = {
    id: string;
    purchaseOrderItemId: string;
    piecesPerBox: number;
    boxCount: number;
    totalPieces: number;
    poNumber?: string;
    poDate?: string;
    supplierName?: string;
    notes?: string;
};

export async function getItemShipmentHistory(
    itemId: number,
    organizationId: string,
): Promise<ShipmentBoxConfig[]> {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.rpc("get_item_shipment_history", {
        p_item_id: itemId,
        p_organization_id: organizationId,
    });
    

    if (error || !data) return [];

    // RPC returns flat rows — each row is already one box config
    // NOT nested with box_configs array
    const mapped: ShipmentBoxConfig[] = (data as any[]).map((row) => ({
        id: row.config_id ?? `${row.po_number}-${row.config_pieces_per_box}`,
        purchaseOrderItemId: row.po_number, // use as identifier
        piecesPerBox: row.config_pieces_per_box,
        boxCount: row.config_box_count,
        totalPieces: row.config_total_pieces,
        poNumber: row.po_number,
        poDate: row.po_date,
        supplierName: row.supplier_name,
        notes: undefined,
    }));

    // Deduplicate by piecesPerBox — keep most recent per unique config
    const seen = new Set<number>();
    return mapped.filter((c) => {
        if (seen.has(c.piecesPerBox)) return false;
        seen.add(c.piecesPerBox);
        return true;
    });
}
