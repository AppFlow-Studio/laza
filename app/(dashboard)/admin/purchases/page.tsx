"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag, Plus, CalendarDays, TrendingUp, Hash, Search,
} from "lucide-react";
import { useStorePurchases } from "@/lib/hooks/queries/useStorePurchases";
import { useAdminStore } from "@/lib/stores/adminStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function PurchasesPage() {
  const { selectedLocationId } = useAdminStore();
  const { data: purchases, isLoading } = useStorePurchases();
  const [search, setSearch] = useState("");

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthPurchases = useMemo(
    () =>
      (purchases ?? []).filter((p) =>
        isWithinInterval(parseISO(p.purchased_at), { start: monthStart, end: monthEnd })
      ),
    [purchases]
  );

  const totalSpentThisMonth = monthPurchases.reduce((sum, p) => sum + p.total_cost, 0);

  const filtered = useMemo(() => {
    if (!search.trim()) return purchases ?? [];
    const q = search.toLowerCase();
    return (purchases ?? []).filter(
      (p) =>
        p.supplier_name?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [purchases, search]);

  if (!selectedLocationId) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-zinc-200">
        <p className="text-zinc-500">Select a location from the sidebar to view purchases.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Spent this month</p>
            {isLoading ? (
              <Skeleton className="h-5 w-24 mt-1" />
            ) : (
              <p className="text-lg font-semibold text-zinc-900">{formatCurrency(totalSpentThisMonth)}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <Hash className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Purchases this month</p>
            {isLoading ? (
              <Skeleton className="h-5 w-12 mt-1" />
            ) : (
              <p className="text-lg font-semibold text-zinc-900">{monthPurchases.length}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Total purchases</p>
            {isLoading ? (
              <Skeleton className="h-5 w-12 mt-1" />
            ) : (
              <p className="text-lg font-semibold text-zinc-900">{(purchases ?? []).length}</p>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by supplier or ID…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button asChild>
          <Link href="/admin/purchases/new">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Link>
        </Button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-zinc-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              {search ? "No purchases match your search." : "No purchases recorded yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filtered.map((purchase) => (
              <Link
                key={purchase.id}
                href={`/admin/purchases/${purchase.id}`}
                className="px-6 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="bg-indigo-50 p-2 rounded-lg shrink-0">
                    <ShoppingBag className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {purchase.supplier_name ?? "No supplier"}
                    </p>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <CalendarDays className="h-3 w-3" />
                      {format(parseISO(purchase.purchased_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-900">
                    {formatCurrency(purchase.total_cost)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {purchase.store_purchase_items?.length ?? 0} item
                    {(purchase.store_purchase_items?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
