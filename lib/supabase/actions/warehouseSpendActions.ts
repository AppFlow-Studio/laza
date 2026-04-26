"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getMonthlySpendAction(locationId: string): Promise<number> {
    const supabase = createServerSupabaseClient();

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
        .from("store_warehouse_spend_monthly" as any)
        .select("total_spend")
        .eq("location_id", locationId)
        .eq("month", month)
        .maybeSingle();

    if (error) throw error;
    return Number((data as any)?.total_spend ?? 0);
}
