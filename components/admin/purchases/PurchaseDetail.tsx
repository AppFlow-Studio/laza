"use client";

import { useStorePurchase } from "@/lib/hooks/queries/useStorePurchases";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { CalendarDays, User, Receipt } from "lucide-react";

interface Props {
  id: string;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default function PurchaseDetail({ id }: Props) {
  const { data: purchase, isLoading } = useStorePurchase(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-zinc-200">
        <p className="text-zinc-500">Purchase not found.</p>
      </div>
    );
  }

  interface PurchaseLineItem {
    id: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
    items: { name: string | null; unit_of_measure: string | null; sku?: string | null } | null;
  }
  const lineItems: PurchaseLineItem[] = ((purchase as any).store_purchase_items ?? []) as PurchaseLineItem[];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {purchase.supplier_name ?? "No supplier"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">{purchase.id}</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(purchase.total_cost)}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-zinc-600">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            <span>{format(parseISO(purchase.purchased_at), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600">
            <User className="h-4 w-4 text-zinc-400" />
            <span>Recorded by {purchase.purchased_by}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600">
            <Receipt className="h-4 w-4 text-zinc-400" />
            <span>Recorded {format(parseISO(purchase.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>

        {purchase.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-500 mb-1">Notes</p>
            <p className="text-sm text-zinc-700">{purchase.notes}</p>
          </div>
        )}
      </div>

      {/* Line items table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900 text-sm">Items Purchased</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-6 py-3 text-left">Item</th>
              <th className="px-6 py-3 text-right">Qty</th>
              <th className="px-6 py-3 text-right">Unit Cost</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lineItems.map((lineItem) => (
              <tr key={lineItem.id} className="hover:bg-zinc-50">
                <td className="px-6 py-3 font-medium text-zinc-900">
                  {lineItem.items?.name ?? "—"}
                  {lineItem.items?.unit_of_measure && (
                    <span className="text-xs text-zinc-400 ml-1">
                      ({lineItem.items.unit_of_measure})
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-right text-zinc-700">{lineItem.quantity}</td>
                <td className="px-6 py-3 text-right text-zinc-700">
                  {formatCurrency(lineItem.unit_cost)}
                </td>
                <td className="px-6 py-3 text-right font-semibold text-zinc-900">
                  {formatCurrency(lineItem.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50">
              <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-zinc-700">
                Total
              </td>
              <td className="px-6 py-3 text-right text-base font-bold text-zinc-900">
                {formatCurrency(purchase.total_cost)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
