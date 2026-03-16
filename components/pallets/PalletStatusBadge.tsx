// ── PalletStatusBadge.tsx ────────────────────────────────────────────────────
"use client";

type PalletStatus = "active" | "empty" | "retired";

const STATUS_CONFIG: Record<
  PalletStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-green-100 text-green-700 ring-1 ring-green-200",
  },
  empty: {
    label: "Empty",
    className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  },
  retired: {
    label: "Retired",
    className: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  },
};

export function PalletStatusBadge({ status }: { status: PalletStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
