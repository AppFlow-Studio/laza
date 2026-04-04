// __mocks__/analyticsData.ts

export const mockAlerts = [
  { item_id: 1, item_name: "Pistachio", item_sku: "PST-001", urgency: "critical", weeks_remaining: 2.1, avg_weekly_units: 45, current_warehouse_stock: 90 },
  { item_id: 2, item_name: "Nutella", item_sku: "NTL-002", urgency: "warning", weeks_remaining: 5.8, avg_weekly_units: 30, current_warehouse_stock: 174 },
  { item_id: 3, item_name: "Cream Cheese", item_sku: "CCH-003", urgency: "watch", weeks_remaining: 10.2, avg_weekly_units: 20, current_warehouse_stock: 204 },
];

export const mockBurnRates = [
  { item_id: 1, item_name: "Pistachio", item_sku: "PST-001", avg_weekly_units: 45, current_warehouse_stock: 90, weeks_remaining: 2.0 },
  { item_id: 2, item_name: "Nutella", item_sku: "NTL-002", avg_weekly_units: 30, current_warehouse_stock: 174, weeks_remaining: 5.8 },
  { item_id: 4, item_name: "Vanilla", item_sku: "VNL-004", avg_weekly_units: 0, current_warehouse_stock: 500, weeks_remaining: null },
];

export const mockStoreBilling = [
  { location_id: "loc-1", location_name: "Downtown Branch", total_line_value: 12450.50, total_units_fulfilled: 1200, total_boxes_fulfilled: 300, ticket_count: 8, avg_line_value_per_ticket: 1556.31 },
  { location_id: "loc-2", location_name: "Mall Branch", total_line_value: 8320.00, total_units_fulfilled: 800, total_boxes_fulfilled: 200, ticket_count: 5, avg_line_value_per_ticket: 1664.00 },
];

export const mockExpenses = [
  { expense_type: "pallet_delivery", month: "2025-01", total_amount: 650, entry_count: 2 },
  { expense_type: "pallet_rent", month: "2025-01", total_amount: 1200, entry_count: 1 },
  { expense_type: "pallet_delivery", month: "2025-02", total_amount: 780, entry_count: 3 },
  { expense_type: "container_unload", month: "2025-02", total_amount: 450, entry_count: 1 },
];

export const mockMargins = [
  { item_id: 1, item_name: "Pistachio", item_sku: "PST-001", current_unit_cost: 12.50, avg_transfer_price: 10.20, latest_transfer_price: 10.20, price_gap: 2.30, is_stale: true, last_fulfilled_at: "2025-03-10T10:00:00Z" },
  { item_id: 2, item_name: "Nutella", item_sku: "NTL-002", current_unit_cost: 5.00, avg_transfer_price: 5.00, latest_transfer_price: 5.00, price_gap: 0, is_stale: false, last_fulfilled_at: "2025-03-12T10:00:00Z" },
];

export const mockCostTrends = [
  { item_id: 1, item_name: "Pistachio", item_sku: "PST-001", unit_cost_after: 10.20, unit_price_before: 8.50, effective_date: "2024-09-01", purchase_order_id: "po-1" },
  { item_id: 1, item_name: "Pistachio", item_sku: "PST-001", unit_cost_after: 11.80, unit_price_before: 9.80, effective_date: "2025-01-15", purchase_order_id: "po-2" },
  { item_id: 1, item_name: "Pistachio", item_sku: "PST-001", unit_cost_after: 12.50, unit_price_before: 10.40, effective_date: "2025-03-01", purchase_order_id: "po-3" },
];