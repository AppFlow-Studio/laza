"use server"

import type { Database } from "@/lib/supabase/types";
import { createWarehouseExpenseAction, getWarehouseExpensesAction, getExpenseSummaryAction } from "../actions/warehouseExpenseActions";
import { createServiceRoleClient } from "../server";

type WarehouseExpense =
    Database["public"]["Tables"]["warehouse_expenses"]["Row"];
type WarehouseExpenseInsert =
    Database["public"]["Tables"]["warehouse_expenses"]["Insert"];
type ExpenseRate =
    Database["public"]["Tables"]["warehouse_expense_rates"]["Row"];

export type ExpenseType =
    | "pallet_delivery"
    | "container_unload"
    | "delivery"
    | "pallet_rent"
    | "other";

export interface WarehouseExpenseFilters {
    expenseType?: ExpenseType;
    purchaseOrderId?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseLocationId?: string;   // ← ADD THIS
}

export interface ExpenseSummary {
    expense_type: ExpenseType;
    total_amount: number;
    entry_count: number;
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

/**
 * Get warehouse expenses with optional type/date filtering.
 */
export async function getWarehouseExpenses(
    organizationId: string,
    filters?: WarehouseExpenseFilters,
): Promise<WarehouseExpense[]> {
    return getWarehouseExpensesAction(organizationId, filters);
}

/**
 * Create a new warehouse expense entry.
 * Rate is recorded at time of creation so historical records are unaffected
 * by future rate changes.
 */
export async function createWarehouseExpense(
    expense: Omit<WarehouseExpenseInsert, "id" | "created_at" | "updated_at">,
): Promise<WarehouseExpense> {
    return createWarehouseExpenseAction(expense);
}

/**
 * Monthly expense totals grouped by type, for the summary cards.
 * Defaults to current calendar month.
 */
export async function getExpenseSummary(
    organizationId: string,
    dateRange?: { from: string; to: string },
    warehouseLocationId?: string,
): Promise<ExpenseSummary[]> {
    const now = new Date();
    const from =
        dateRange?.from ??
        new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];
    const to =
        dateRange?.to ??
        new Date(now.getFullYear(), now.getMonth() + 1, 0)
            .toISOString()
            .split("T")[0];

    const rows = await getExpenseSummaryAction(organizationId, from, to, warehouseLocationId);

    const summaryMap = new Map<ExpenseType, ExpenseSummary>();
    for (const row of rows) {
        const type = row.expense_type as ExpenseType;
        const existing = summaryMap.get(type);
        if (existing) {
            existing.total_amount += Number(row.amount);
            existing.entry_count += 1;
        } else {
            summaryMap.set(type, {
                expense_type: type,
                total_amount: Number(row.amount),
                entry_count: 1,
            });
        }
    }

    return Array.from(summaryMap.values());
}

// ─── EXPENSE RATES ───────────────────────────────────────────────────────────

/**
 * Get all default expense rates for the organization.
 */
export async function getExpenseRates(
    organizationId: string,
): Promise<ExpenseRate[]> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
        .from("warehouse_expense_rates")
        .select("*")
        .eq("organization_id", organizationId)
        .order("expense_type");

    if (error) throw error;
    return data ?? [];
}

/**
 * Update a single expense type's default rate.
 * Historical expense records are NOT affected — they store rate_per_pallet
 * at time of creation.
 */
export async function updateExpenseRate(
    organizationId: string,
    expenseType: ExpenseType,
    newRate: number,
): Promise<ExpenseRate> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
        .from("warehouse_expense_rates")
        .upsert(
            {
                organization_id: organizationId,
                expense_type: expenseType,
                default_rate: newRate,
                rate_unit: "per_pallet",
            },
            { onConflict: "organization_id,expense_type" },
        )
        .select()
        .single();

    if (error) throw error;
    return data;
}
