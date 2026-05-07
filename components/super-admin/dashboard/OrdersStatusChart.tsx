"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const STATUS_COLORS: Record<string, string> = {
    draft:      "#d1d5db",
    submitted:  "#3b82f6",
    processing: "#f59e0b",
    fulfilled:  "#8b5cf6",
    confirmed:  "#10b981",
    rejected:   "#ef4444",
    cancelled:  "#9ca3af",
};

const STATUS_LABELS: Record<string, string> = {
    draft:      "Draft",
    submitted:  "Submitted",
    processing: "Processing",
    fulfilled:  "Fulfilled",
    confirmed:  "Confirmed",
    rejected:   "Rejected",
    cancelled:  "Cancelled",
};

interface Props {
    tickets: { status: string }[];
}

export function OrdersStatusChart({ tickets }: Props) {
    const counts = tickets.reduce<Record<string, number>>((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
    }, {});

    const data = Object.entries(counts)
        .filter(([, v]) => v > 0)
        .map(([status, value]) => ({
            name:  STATUS_LABELS[status] ?? status,
            value,
            color: STATUS_COLORS[status] ?? "#6b7280",
        }));

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                No orders yet
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                >
                    {data.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(value: number, name: string) => [value, name]}
                />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
