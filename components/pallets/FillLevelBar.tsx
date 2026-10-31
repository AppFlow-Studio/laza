"use client";

interface FillLevelBarProps {
  current: number;
  capacity: number;
  showLabel?: boolean;
}

export function FillLevelBar({
  current,
  capacity,
  showLabel = true,
}: FillLevelBarProps) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;

  const barColor =
    pct === 0
      ? "bg-gray-200"
      : pct < 25
      ? "bg-amber-400"
      : pct < 75
      ? "bg-indigo-400"
      : "bg-green-500";

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="whitespace-nowrap text-xs tabular-nums text-gray-500">
          {current}/{capacity}
        </span>
      )}
    </div>
  );
}
