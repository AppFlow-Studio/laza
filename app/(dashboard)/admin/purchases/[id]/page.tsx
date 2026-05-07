"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PurchaseDetail from "@/components/admin/purchases/PurchaseDetail";

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-4">
      <Link
        href="/admin/purchases"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Purchases
      </Link>
      <PurchaseDetail id={id} />
    </div>
  );
}
