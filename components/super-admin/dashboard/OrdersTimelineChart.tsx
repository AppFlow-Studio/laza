"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface Props {
    tickets: { created_at: string; status: string }[];
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

export function OrdersTimelineChart({ tickets }: Props) {
    const days = getLast7Days();

    const data = days.map((day) => {
        const dayTickets = tickets.filter((t) => t.created_at.slice(0, 10) === day);
        return {
            day:       new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
            Submitted: dayTickets.filter((t) => t.status === "submitted").length,
            Confirmed: dayTickets.filter((t) => t.status === "confirmed").length,
            Other:     dayTickets.filter((t) => t.status !== "submitted" && t.status !== "confirmed").length,
        };
    });

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    cursor={{ fill: "#f9fafb" }}
                />
                <Bar dataKey="Submitted" fill="#3b82f6" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="Confirmed" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="Other"     fill="#d1d5db" radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
        </ResponsiveContainer>
    );
}
