"use client";

import { formatDistanceToNow } from "date-fns";

type LogEntry = {
  id: string;
  operation_type: string;
  box_count_change: number | null;
  notes: string | null;
  created_at: string;
  users: { first_name: string | null; last_name: string | null } | null;
  items: { name: string; short_label: string | null } | null;
  related_pallet: { pallet_label: string } | null;
};

interface PalletActivityLogProps {
  log: LogEntry[];
  isLoading: boolean;
}

const OP_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  created: { label: "Created", color: "text-green-700", dot: "bg-green-400" },
  loaded: { label: "Loaded", color: "text-indigo-700", dot: "bg-indigo-400" },
  moved: { label: "Moved", color: "text-blue-700", dot: "bg-blue-400" },
  consolidated_from: { label: "Moved out", color: "text-orange-700", dot: "bg-orange-400" },
  consolidated_to: { label: "Moved in", color: "text-teal-700", dot: "bg-teal-400" },
  emptied: { label: "Emptied", color: "text-gray-500", dot: "bg-gray-300" },
  retired: { label: "Retired", color: "text-red-600", dot: "bg-red-400" },
  reactivated: { label: "Reactivated", color: "text-green-700", dot: "bg-green-400" },
};

export function PalletActivityLog({ log, isLoading }: PalletActivityLogProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Activity Log</h2>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : log.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <p className="text-sm text-gray-400">No activity yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50 overflow-y-auto">
          {log.map((entry) => {
            const cfg = OP_CONFIG[entry.operation_type] ?? {
              label: entry.operation_type,
              color: "text-gray-600",
              dot: "bg-gray-300",
            };
            const userName = entry.users
              ? [entry.users.first_name, entry.users.last_name]
                  .filter(Boolean)
                  .join(" ")
              : "System";

            return (
              <li key={entry.id} className="flex gap-3 px-4 py-3">
                <div className="mt-1.5 flex-shrink-0">
                  <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">
                    <span className={`font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {entry.items && (
                      <span className="text-gray-600">
                        {" "}
                        — {entry.items.short_label ?? entry.items.name}
                      </span>
                    )}
                    {entry.box_count_change != null && (
                      <span
                        className={`ml-1 font-mono text-xs ${
                          entry.box_count_change >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {entry.box_count_change >= 0 ? "+" : ""}
                        {entry.box_count_change} boxes
                      </span>
                    )}
                    {entry.related_pallet && (
                      <span className="text-gray-500">
                        {" "}
                        ↔{" "}
                        <span className="font-mono text-xs">
                          {entry.related_pallet.pallet_label}
                        </span>
                      </span>
                    )}
                  </p>
                  {entry.notes && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {entry.notes}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400">
                    {userName} ·{" "}
                    {formatDistanceToNow(new Date(entry.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
