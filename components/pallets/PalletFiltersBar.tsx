"use client";

import { Search, X } from "lucide-react";
import { PalletFilters } from "@/lib/supabase/queries/pallets";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useState, useEffect } from "react";

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string | null;
}

interface PalletFiltersBarProps {
  filters: PalletFilters;
  onFilterChange: (partial: Partial<PalletFilters>) => void;
  purchaseOrders: PurchaseOrder[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "empty", label: "Empty" },
  { value: "retired", label: "Retired" },
];

export function PalletFiltersBar({
                                   filters,
                                   onFilterChange,
                                   purchaseOrders,
                                 }: PalletFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    onFilterChange({ search: debouncedSearch || undefined });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters =
      filters.status ||
      filters.purchaseOrderId ||
      filters.search;

  const clearAll = () => {
    setSearchInput("");
    onFilterChange({
      status: undefined,
      purchaseOrderId: undefined,
      search: undefined,
    });
  };

  return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
              type="text"
              placeholder="Search pallets or items…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Status */}
        <select
            value={filters.status ?? ""}
            onChange={(e) =>
                onFilterChange({
                  status: (e.target.value as PalletFilters["status"]) || undefined,
                })
            }
            className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
          ))}
        </select>

        {/* Purchase Order */}
        {purchaseOrders.length > 0 && (
            <select
                value={filters.purchaseOrderId ?? ""}
                onChange={(e) =>
                    onFilterChange({ purchaseOrderId: e.target.value || undefined })
                }
                className="rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Shipments</option>
              {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.po_number}
                    {po.supplier_name ? ` — ${po.supplier_name}` : ""}
                  </option>
              ))}
            </select>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
            <button
                onClick={clearAll}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
        )}
      </div>
  );
}