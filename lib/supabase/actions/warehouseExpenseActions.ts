"use server";

import { WarehouseExpenseFilters } from "../queries/warehouseExpenses";
import { createServiceRoleClient } from "../server";
import { WarehouseExpense, WarehouseExpenseInsert } from "@/lib/supabase/types";


export async function createWarehouseExpenseAction(
    expense: Omit<WarehouseExpenseInsert, "id" | "created_at" | "updated_at">,
): Promise<WarehouseExpense> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from("warehouse_expenses")
        .insert(expense)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function updateWarehouseExpenseTitleAction(
    id: string,
    title: string | null,
): Promise<WarehouseExpense> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from("warehouse_expenses")
        .update({ title })
        .eq("id", id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function getWarehouseExpensesAction(
    organizationId: string,
    filters?: WarehouseExpenseFilters,
): Promise<WarehouseExpense[]> {
    const supabase = createServiceRoleClient();

    let query = supabase
        .from("warehouse_expenses")
        .select("*")
        .eq("organization_id", organizationId)
        .order("expense_date", { ascending: false });

    if (filters?.expenseType) {
        query = query.eq("expense_type", filters.expenseType);
    }
    if (filters?.purchaseOrderId) {
        query = query.eq("purchase_order_id", filters.purchaseOrderId);
    }
    if (filters?.warehouseLocationId) {
        query = query.eq("warehouse_location_id", filters.warehouseLocationId);
    }
    if (filters?.dateFrom) {
        query = query.gte("expense_date", filters.dateFrom);
    }
    if (filters?.dateTo) {
        query = query.lte("expense_date", filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function getExpenseSummaryAction(
    organizationId: string,
    from: string,
    to: string,
    warehouseLocationId?: string,
): Promise<Array<{ expense_type: string; amount: number }>> {
    const supabase = createServiceRoleClient();

    let query = supabase
        .from("warehouse_expenses")
        .select("expense_type, amount")
        .eq("organization_id", organizationId)
        .gte("expense_date", from)
        .lte("expense_date", to);

    if (warehouseLocationId) {
        query = query.eq("warehouse_location_id", warehouseLocationId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
}