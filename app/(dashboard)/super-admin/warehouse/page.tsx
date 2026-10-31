// /super-admin/warehouse
"use client";

import { useWarehouses } from "@/lib/hooks/queries/useWarehouse";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import {
	Package,
	Thermometer,
	Snowflake,
	Wind,
	LayoutGrid,
	List,
	Search,
	Plus,
	MapPin,
	ChevronRight,
	Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Location } from "@/lib/supabase/types";

// ─── Temp badge ──────────────────────────────────────────────────────────────

const TEMP_CONFIG: Record<
	string,
	{ label: string; icon: React.ElementType; className: string }
> = {
	frozen: { label: "Frozen", icon: Snowflake, className: "bg-blue-100 text-blue-700" },
	refrigerated: { label: "Refrigerated", icon: Thermometer, className: "bg-cyan-100 text-cyan-700" },
	dry: { label: "Dry", icon: Wind, className: "bg-amber-100 text-amber-700" },
};

function TempBadge({ type }: { type: string }) {
	const config = TEMP_CONFIG[type] ?? { label: type, icon: Package, className: "bg-zinc-100 text-zinc-600" };
	const Icon = config.icon;
	return (
		<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${config.className}`}>
            <Icon className="w-3 h-3" />
			{config.label}
        </span>
	);
}

// ─── Address helper ───────────────────────────────────────────────────────────

function formatAddress(raw: unknown): string {
	if (!raw) return "—";
	const a = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, string>);
	return [a.street, a.city, a.state, a.zip].filter(Boolean).join(", ");
}

// ─── Card view ────────────────────────────────────────────────────────────────

function WarehouseCard({ warehouse }: { warehouse: Location & { storage_spaces?: { temperature_type: string }[] } }) {
	const spaces = warehouse.storage_spaces ?? [];
	const tempCounts = Object.fromEntries(
		Object.keys(TEMP_CONFIG).map((t) => [t, spaces.filter((s) => s.temperature_type === t).length])
	);

	return (
		<Link
			href={`/super-admin/warehouse/${warehouse.id}?tab=inventory`}
			className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:shadow-md hover:border-zinc-300 transition-all group flex flex-col gap-4"
		>
			<div className="flex items-start justify-between">
				<div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
					<Warehouse className="w-5 h-5 text-indigo-500" />
				</div>
				<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    Warehouse
                </span>
			</div>

			<div className="flex items-center justify-between pt-3">
				<div>
					<p className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">
						{warehouse.name}
					</p>
					<p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
						<MapPin className="w-3 h-3 shrink-0" />
						{formatAddress(warehouse.address)}
					</p>
				</div>

				<div className="flex items-center justify-between pt-3">

					<ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
				</div>
			</div>
		</Link>
	);
}

// ─── Table row ────────────────────────────────────────────────────────────────

function WarehouseRow({ warehouse }: { warehouse: Location & { storage_spaces?: { temperature_type: string }[] } }) {
	const spaces = warehouse.storage_spaces ?? [];

	return (
		<tr className="hover:bg-zinc-50 transition-colors group">
			<td className="px-4 py-3">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
						<Warehouse className="w-4 h-4 text-indigo-500" />
					</div>
					<Link
						href={`/super-admin/warehouse/${warehouse.id}`}
						className="font-medium text-zinc-900 group-hover:text-indigo-600 transition-colors"
					>
						{warehouse.name}
					</Link>
				</div>
			</td>
			<td className="px-4 py-3 text-sm text-zinc-500">
				{formatAddress(warehouse.address)}
			</td>
			<td className="px-4 py-3 text-sm text-zinc-700 text-center">
				{spaces.length}
			</td>
			<td className="px-4 py-3">
				<div className="flex flex-wrap gap-1">
					{Object.keys(TEMP_CONFIG).map((type) => {
						const count = spaces.filter((s) => s.temperature_type === type).length;
						return count > 0 ? <TempBadge key={type} type={type} /> : null;
					})}
					{spaces.length === 0 && <span className="text-xs text-zinc-400">—</span>}
				</div>
			</td>
			<td className="px-4 py-3 text-right">
				<Link
					href={`/super-admin/warehouse/${warehouse.id}`}
					className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
				>
					View <ChevronRight className="w-3.5 h-3.5" />
				</Link>
			</td>
		</tr>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WarehousesPage() {
	const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
	const [search, setSearch] = useState("");

	const { data: warehouses = [], isLoading } = useWarehouses();

	const filtered = warehouses.filter((w) => {
		const q = search.toLowerCase();
		if (!q) return true;
		const addr = formatAddress(w.address).toLowerCase();
		return w.name.toLowerCase().includes(q) || addr.includes(q);
	});

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900">Warehouses</h1>
					<p className="text-sm text-zinc-500 mt-1">
						{warehouses.length} warehouse{warehouses.length !== 1 ? "s" : ""} configured
					</p>
				</div>
				<Link
					href="/super-admin/warehouse/new"
					className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
				>
					<Plus className="w-4 h-4" />
					Add Warehouse
				</Link>
			</div>

			{/* Toolbar */}
			<div className="flex items-center gap-3">
				<div className="relative flex-1 max-w-xs">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<input
						type="text"
						placeholder="Search warehouses…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					/>
				</div>
				<div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
					<button
						onClick={() => setViewMode("grid")}
						className={`p-2 transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"}`}
						title="Grid view"
					>
						<LayoutGrid className="w-4 h-4" />
					</button>
					<button
						onClick={() => setViewMode("table")}
						className={`p-2 transition-colors ${viewMode === "table" ? "bg-indigo-600 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"}`}
						title="Table view"
					>
						<List className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Content */}
			{isLoading ? (
				viewMode === "grid" ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<LoadingSkeleton key={i} className="h-44 w-full rounded-xl" />
						))}
					</div>
				) : (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<LoadingSkeleton key={i} className="h-14 w-full rounded-lg" />
						))}
					</div>
				)
			) : filtered.length === 0 ? (
				<div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-20 text-center">
					<Warehouse className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
					<p className="text-zinc-500 font-medium">
						{search ? "No warehouses match your search" : "No warehouses configured"}
					</p>
					{!search && (
						<p className="text-zinc-400 text-sm mt-1">
							Add your first warehouse to get started.
						</p>
					)}
				</div>
			) : viewMode === "grid" ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{filtered.map((w) => (
						<WarehouseCard key={w.id} warehouse={w as any} />
					))}
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
					<table className="w-full text-sm">
						<thead>
						<tr className="border-b border-zinc-100 bg-zinc-50 text-left">
							<th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Name</th>
							<th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Address</th>
							<th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-center">Spaces</th>
							<th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Storage Types</th>
							<th className="px-4 py-3"></th>
						</tr>
						</thead>
						<tbody className="divide-y divide-zinc-100">
						{filtered.map((w) => (
							<WarehouseRow key={w.id} warehouse={w as any} />
						))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}