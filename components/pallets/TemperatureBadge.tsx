"use client";

const TEMP_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  frozen: { label: "Frozen", className: "bg-blue-100 text-blue-700", icon: "🧊" },
  refrigerated: { label: "Refrigerated", className: "bg-cyan-100 text-cyan-700", icon: "❄️" },
  dry: { label: "Dry", className: "bg-orange-100 text-orange-700", icon: "📦" },
};

export function TemperatureBadge({ type }: { type: string }) {
  const config = TEMP_CONFIG[type] ?? TEMP_CONFIG.dry;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
