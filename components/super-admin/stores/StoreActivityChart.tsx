"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface LogEntry {
    created_at: string;
    quantity_change: number;
}

interface Props {
    logs: LogEntry[];
}

function getLast7Days(): string[] {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
}

export function StoreActivityChart({ logs }: Props) {
    const days = getLast7Days();

    const data = days.map((day) => {
        const dayLogs = logs.filter((l) => l.created_at.slice(0, 10) === day);
        const totalIn  = dayLogs.filter((l) => l.quantity_change > 0).reduce((s, l) => s + l.quantity_change, 0);
        const totalOut = dayLogs.filter((l) => l.quantity_change < 0).reduce((s, l) => s + Math.abs(l.quantity_change), 0);
        return {
            day:        new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
            "Stock In":  totalIn,
            "Stock Out": totalOut,
        };
    });

    const hasActivity = data.some((d) => d["Stock In"] > 0 || d["Stock Out"] > 0);

    if (!hasActivity) {
        return (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                No activity in the last 7 days
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <Area type="monotone" dataKey="Stock In"  stroke="#6366f1" fill="url(#colorIn)"  strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Stock Out" stroke="#f59e0b" fill="url(#colorOut)" strokeWidth={2} dot={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
