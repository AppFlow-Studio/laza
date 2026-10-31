
import type { Database } from '@/lib/supabase/types';
import { createServerSupabaseClient } from '../server';

type ItemCostHistory = Database['public']['Tables']['item_cost_history']['Row'];

export interface CostTrendFilters {
  itemIds?: number[];
  dateRange?: { from: string; to: string };
}

export interface CostTrendPoint extends ItemCostHistory {
  item_name: string;
  item_sku: string | null;
}

// ─── COST HISTORY ────────────────────────────────────────────────────────────

/**
 * Get cost history for a single item — time-series data for the trend chart.
 */
export async function getItemCostHistory(itemId: number): Promise<ItemCostHistory[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('item_cost_history')
    .select('*')
    .eq('item_id', itemId)
    .order('effective_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get cost trends for multiple items with item name joined.
 * Used for the multi-item comparison chart on the analytics page.
 */
export async function getCostTrends(
  organizationId: string,
  filters?: CostTrendFilters
): Promise<CostTrendPoint[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('item_cost_history')
    .select(`
      *,
      item:items ( name, sku )
    `)
    .eq('organization_id', organizationId)
    .order('effective_date', { ascending: true });

  if (filters?.itemIds && filters.itemIds.length > 0) {
    query = query.in('item_id', filters.itemIds);
  }
  if (filters?.dateRange?.from) {
    query = query.gte('effective_date', filters.dateRange.from);
  }
  if (filters?.dateRange?.to) {
    query = query.lte('effective_date', filters.dateRange.to);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    item_name: row.item?.name ?? 'Unknown',
    item_sku: row.item?.sku ?? null,
  }));
}