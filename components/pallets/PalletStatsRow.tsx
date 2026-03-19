"use client";

import { PalletStats } from "@/lib/supabase/queries/pallets";
import { PackageCheck, Package, PackageMinus, Archive } from "lucide-react";

interface PalletStatsRowProps {
  stats: PalletStats | undefined;
  isLoading: boolean;
}

const STAT_CARDS = [
  {
    key: "total" as keyof PalletStats,
    label: "Total Pallets",
    icon: Package,
    color: "text-gray-700",
    bg: "bg-gray-50",
    iconColor: "text-gray-500",
  },
  {
    key: "active" as keyof PalletStats,
    label: "Active",
    icon: PackageCheck,
    color: "text-green-700",
    bg: "bg-green-50",
    iconColor: "text-green-500",
  },
  {
    key: "empty" as keyof PalletStats,
    label: "Empty",
    icon: PackageMinus,
    color: "text-amber-700",
    bg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
  {
    key: "retired" as keyof PalletStats,
    label: "Retired",
    icon: Archive,
    color: "text-gray-500",
    bg: "bg-gray-50",
    iconColor: "text-gray-400",
  },
];

export function PalletStatsRow({ stats, isLoading }: PalletStatsRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="h-24 animate-pulse rounded-xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, iconColor }) => (
        <div
          key={key}
          className={`flex items-center gap-4 rounded-xl border border-gray-100 ${bg} px-5 py-4`}
        >
          <div className={`rounded-lg bg-white p-2 shadow-sm`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-2xl font-semibold ${color}`}>
              {stats?.[key] ?? 0}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
