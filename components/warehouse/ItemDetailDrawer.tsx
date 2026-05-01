"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	useItemOverview,
	useItemPalletStock,
	useItemBoxTotals,
	useItemShipmentHistory,
	useItemCostHistory,
} from "@/lib/hooks/queries/useItemDetail";
import { useItemPriceHistory } from "@/lib/hooks/queries/useItemPriceHistory";
import type { PriceHistoryRecord } from "@/lib/supabase/queries/priceHistory";
import type { ItemShipmentRecord } from "@/lib/supabase/queries/itemDetail";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemDetailDrawerProps {
	itemId: number | null;
	warehouseLocationId: string;
	open: boolean;
	onClose: () => void;
}

type Tab = "overview" | "stock" | "shipments" | "cost" | "price";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0) {
	if (n == null) return "—";
	return n.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}

function fmtDate(s: string | null) {
	if (!s) return "—";
	return new Date(s).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function fmtDateShort(s: string | null) {
	if (!s) return "—";
	return new Date(s).toLocaleDateString("en-US", {
		month: "short",
		year: "2-digit",
	});
}

function StatusBadge({ status }: { status: string }) {
	const colors: Record<string, string> = {
		active: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
		empty: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
		retired: "bg-zinc-700 text-zinc-400",
	};
	return (
		<span
			className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors[status] ?? colors.retired}`}
		>
      {status}
    </span>
	);
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
						 itemId,
						 warehouseLocationId,
					 }: {
	itemId: number;
	warehouseLocationId: string;
}) {
	const { data: overview, isLoading } = useItemOverview(
		itemId,
		warehouseLocationId
	);

	if (isLoading) return <TabSkeleton rows={6} />;
	if (!overview)
		return <EmptyState message="Could not load item overview." />;

	const stats = [
		{
			label: "Warehouse Boxes",
			value: fmt(overview.warehouse_boxes),
			accent: true,
		},
		{
			label: "Total Pieces",
			value: fmt(overview.warehouse_pieces),
			accent: true,
		},
		{
			label: "Pieces / Box",
			value: overview.has_mixed_configs ? "mixed" : fmt(overview.current_pieces_per_box),
		},
		{ label: "Active Pallets", value: fmt(overview.active_pallet_count) },
		{
			label: "Unit Cost",
			value: overview.unit_cost != null ? `$${overview.unit_cost.toFixed(2)}` : "—",
		},
		{
			label: "CBM",
			value: overview.cbm != null ? `${overview.cbm.toFixed(3)} m³` : "—",
		},
	];

	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Item identity */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					{overview.category_name && (
						<span className="rounded bg-blue-800 px-2 py-0.5 text-[14px] font-medium text-white">
              {overview.category_name}
            </span>
					)}
					{overview.short_label && (
						<span className="rounded bg-blue-900/40 px-2 py-0.5 text-[11px] font-medium text-blue-300 ring-1 ring-blue-700/50">
              {overview.short_label}
            </span>
					)}
				</div>
				{overview.sku && (
					<p className="mt-1 font-mono text-xs  ">
						SKU: {overview.sku}
					</p>
				)}
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-2 gap-3">
				{stats.map((s) => (
					<div
						key={s.label}
						className={`flex flex-col gap-1 rounded-lg border p-4 `}
					>
            <span className="text-[11px] font-medium uppercase tracking-wider  ">
              {s.label}
            </span>
						<span
							className={`text-xl font-semibold tabular-nums `}
						>
              {s.value}
            </span>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Stock Tab ────────────────────────────────────────────────────────────────

function StockTab({ itemId }: { itemId: number }) {
	const { data: pallets = [], isLoading } = useItemPalletStock(itemId);

	if (isLoading) return <TabSkeleton rows={5} />;
	if (pallets.length === 0)
		return <EmptyState message="No pallet stock found for this item." />;

	// Group by storage space
	const grouped = pallets.reduce<Record<string, typeof pallets>>(
		(acc, p) => {
			const key = p.storage_space_name ?? "";
			if (!acc[key]) acc[key] = [];
			acc[key].push(p);
			return acc;
		},
		{}
	);

	return (
		<div className="flex flex-col gap-4 p-6">
			{Object.entries(grouped).map(([spaceName, rows]) => {
				const totalBoxes = rows.reduce((s, r) => s + r.box_count, 0);
				const totalPieces = rows.reduce((s, r) => s + r.total_pieces, 0);

				return (
					<div key={spaceName}>
						<div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {spaceName}
              </span>
							<span className="text-xs  ">
                {fmt(totalBoxes)} boxes · {fmt(totalPieces)} pcs
              </span>
						</div>
						<div className="overflow-hidden rounded-lg border">
							<table className="min-w-full divide-y divide-gray-50">
								<thead className="bg-gray-50">
								<tr className="border-b">
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
										Pallet
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
										Boxes
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
										Pcs/Box
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
										Total Pcs
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
										Status
									</th>
								</tr>
								</thead>
								<tbody  className="divide-y divide-gray-50">
								{rows.map((p) => (
									<tr
										key={p.pallet_id}
										className="hover:bg-gray-50/50 hover:cursor-pointer"
									>
										<td className="px-3 py-2.5 font-mono text-xs">
											{p.pallet_label}
										</td>
										<td className="px-3 py-2.5 text-right tabular-nums  text-xs">
											{fmt(p.box_count)}
										</td>
										<td className="px-3 py-2.5 text-right tabular-nums  text-xs">
											{p.has_mixed_configs ? "mixed" : fmt(p.effective_pieces_per_box)}
										</td>
										<td className="px-3 py-2.5 text-right tabular-nums  text-xs">
											{fmt(p.total_pieces)}
										</td>
										<td className="px-3 py-2.5 text-right">
											<StatusBadge status={p.status} />
										</td>
									</tr>
								))}
								</tbody>
							</table>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ─── Shipment History Tab ─────────────────────────────────────────────────────

function ShipmentRow({ record, index }: { record: ItemShipmentRecord; index: number }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<>
			<motion.tr
				custom={index}
				initial={{ opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] } }}
				className="hover:bg-gray-50/50 hover:cursor-pointer border-b border-gray-100 last:border-0"
				onClick={() => setExpanded((v) => !v)}
			>
				<td className="px-3 py-3">
					<div className="flex items-center gap-2">
						<motion.svg
							animate={{ rotate: expanded ? 90 : 0 }}
							transition={{ duration: 0.18 }}
							className="h-3 w-3 flex-shrink-0 text-zinc-400"
							viewBox="0 0 12 12"
							fill="currentColor"
						>
							<path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
						</motion.svg>
						<span className="font-mono text-xs font-medium text-gray-700">
              {record.po_number}
            </span>
						{record.has_mixed_configs && (
							<span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-200">
                MIXED
              </span>
						)}
					</div>
				</td>
				<td className="px-3 py-3 text-xs text-gray-500">
					{fmtDate(record.po_date)}
				</td>
				<td className="px-3 py-3 text-xs text-gray-500">
					{fmtDate(record.actual_arrival)}
				</td>
				<td className="px-3 py-3 text-right tabular-nums text-xs text-gray-700">
					{fmt(record.po_line_total_boxes)}
				</td>
				<td className="px-3 py-3 text-right tabular-nums text-xs text-gray-700">
					{fmt(record.config_pieces_per_box)}
				</td>
				<td className="px-3 py-3 text-right tabular-nums text-xs font-semibold text-gray-900">
					{fmt(record.config_total_pieces)}
				</td>
			</motion.tr>
			<AnimatePresence initial={false}>
				{expanded && (
					<motion.tr
						key="expanded"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto", transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } }}
						exit={{ opacity: 0, height: 0, transition: { duration: 0.16 } }}
						className="bg-gray-50/60"
					>
						<td colSpan={6} className="px-8 py-4">
							<div className="flex flex-col gap-2">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
									Box Configuration Breakdown
								</p>
								<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
									<table className="min-w-full divide-y divide-gray-100">
										<thead>
										<tr className="bg-gray-50">
											<th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
												Pcs / Box
											</th>
											<th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">
												Boxes
											</th>
											<th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">
												Total Pcs
											</th>
											<th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
												Notes
											</th>
										</tr>
										</thead>
										<tbody className="divide-y divide-gray-50">
										{record.box_configs && record.box_configs.length > 0 ? (
											record.box_configs.map((cfg, i) => (
												<tr
													key={i}
													className="transition-colors hover:bg-indigo-50/40 text-xs"
												>
													<td className="px-3 py-2 tabular-nums text-xs text-gray-700">
														{fmt(cfg.pieces_per_box)}
													</td>
													<td className="px-3 py-2 text-right tabular-nums text-xs text-gray-700">
														{fmt(cfg.box_count)}
													</td>
													<td className="px-3 py-2 text-right text-xs text-gray-700">
														{fmt(cfg.total_pieces)}
													</td>
													<td className="px-3 py-2 text-xs text-gray-500">
														{cfg.notes ?? "—"}
													</td>
												</tr>
											))
										) : record.config_pieces_per_box != null ? (
											<tr className="transition-colors hover:bg-indigo-50/40 text-xs">
												<td className="px-3 py-2 tabular-nums text-xs text-gray-700">
													{fmt(record.config_pieces_per_box)}
												</td>
												<td className="px-3 py-2 text-right tabular-nums text-xs text-gray-700">
													{fmt(record.config_box_count)}
												</td>
												<td className="px-3 py-2 text-right text-xs text-gray-700">
													{fmt(record.config_total_pieces)}
												</td>
												<td className="px-3 py-2 text-xs text-gray-500">
													{record.config_notes ?? "—"}
												</td>
											</tr>
										) : (
											<tr>
												<td colSpan={4} className="px-3 py-3 text-xs text-amber-600 italic">
													Mixed/Unknown box size — enter manually
												</td>
											</tr>
										)}
										</tbody>
									</table>
								</div>
							</div>
						</td>
					</motion.tr>
				)}
			</AnimatePresence>
		</>
	);
}

function ShipmentsTab({ itemId }: { itemId: number }) {
	const { data: shipments = [], isLoading } = useItemShipmentHistory(itemId);
	const { data: totals } = useItemBoxTotals(itemId);

	if (isLoading) return <TabSkeleton rows={4} />;
	if (shipments.length === 0)
		return <EmptyState message="No shipment history found for this item." />;

	return (
		<div className="flex flex-col gap-4 p-6">
			{totals && (
				<div className="grid grid-cols-3 gap-3">
					{[
						{ label: "Weighted Avg", value: `${fmt(totals.weighted_avg_per_box, 1)} pcs/box` },
						{ label: "Total Received", value: `${fmt(totals.total_boxes_received)} boxes` },
						{ label: "Shipments", value: String(totals.shipment_count) },
					].map((s, i) => (
						<motion.div
							key={s.label}
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: i * 0.06 } }}
							className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3"
						>
							<span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
								{s.label}
							</span>
							<span className="text-lg font-semibold tabular-nums text-gray-900 mt-0.5">
								{s.value}
							</span>
						</motion.div>
					))}
				</div>
			)}

			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<table className="min-w-full">
					<thead className="bg-gray-50 border-b border-gray-100">
					<tr>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">PO #</th>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">PO Date</th>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Arrived</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Boxes</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Pcs/Box</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Total Pcs</th>
					</tr>
					</thead>
					<tbody>
					{shipments.map((s, i) => (
						<ShipmentRow key={`${s.po_number}-${i}`} record={s} index={i} />
					))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// ─── Cost History Tab ─────────────────────────────────────────────────────────

// Custom tooltip for the line chart
function CostTooltip({
						 active,
						 payload,
						 label,
					 }: {
	active?: boolean;
	payload?: Array<{ value: number; dataKey: string }>;
	label?: string;
}) {
	if (!active || !payload?.length) return null;

	const before = payload.find((p) => p.dataKey === "unit_price_before");
	const after = payload.find((p) => p.dataKey === "unit_cost_after");

	return (
		<div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-xs">
			<p className="mb-1.5 font-semibold text-gray-700">{label}</p>
			{before?.value != null && (
				<p className="text-gray-400">
					Before:{" "}
					<span className="font-mono font-medium text-gray-600">
						${before.value.toFixed(2)}
					</span>
				</p>
			)}
			{after?.value != null && (
				<p className="text-blue-600">
					After:{" "}
					<span className="font-mono font-semibold">
						${after.value.toFixed(2)}
					</span>
				</p>
			)}
		</div>
	);
}

function CostHistoryTab({ itemId }: { itemId: number }) {
	const { data: history = [], isLoading } = useItemCostHistory(itemId);
	const [chartKey, setChartKey] = useState(0);

	useEffect(() => {
		setChartKey((k) => k + 1);
	}, [itemId]);

	if (isLoading) return <TabSkeleton rows={5} />;
	if (history.length === 0)
		return <EmptyState message="No cost history found for this item." />;

	const chartData = history.map((r) => ({
		date: fmtDateShort(r.effective_date),
		unit_price_before: r.unit_price_before ?? undefined,
		unit_cost_after: r.unit_cost_after,
		po_number: r.po_number,
		notes: r.notes,
		rawDate: r.effective_date,
	}));

	const latest = history[history.length - 1];
	const earliest = history[0];
	const totalChange =
		earliest.unit_price_before != null
			? latest.unit_cost_after - earliest.unit_price_before
			: null;
	const isUp = totalChange != null && totalChange > 0;
	const isDown = totalChange != null && totalChange < 0;

	const allValues = history.flatMap((r) =>
		[r.unit_price_before, r.unit_cost_after].filter((v): v is number => v != null)
	);
	const minY = Math.floor(Math.min(...allValues) * 0.95 * 100) / 100;
	const maxY = Math.ceil(Math.max(...allValues) * 1.05 * 100) / 100;

	return (
		<motion.div
			initial={{ opacity: 0, x: 12 }}
			animate={{ opacity: 1, x: 0, transition: { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] } }}
			className="flex flex-col gap-5 p-6"
		>
			<div className="grid grid-cols-3 gap-3">
				{[
					{ label: "Current Cost", value: `$${latest.unit_cost_after.toFixed(2)}`, color: "text-gray-900" },
					{ label: "Changes", value: String(history.length), color: "text-gray-900" },
					...(totalChange != null
						? [{ label: "Net Change", value: `${isUp ? "+" : ""}$${totalChange.toFixed(2)}`, color: isUp ? "text-red-500" : isDown ? "text-emerald-500" : "text-gray-900" }]
						: []),
				].map((s, i) => (
					<motion.div
						key={s.label}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: i * 0.06 } }}
						className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3"
					>
						<span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
							{s.label}
						</span>
						<span className={`text-xl font-semibold tabular-nums mt-0.5 ${s.color}`}>
							{s.value}
						</span>
					</motion.div>
				))}
			</div>

			<div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 pt-4 pb-2">
				<p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
					Unit Cost Over Time
				</p>
				<ResponsiveContainer width="100%" height={200}>
					<LineChart
						key={chartKey}
						data={chartData}
						margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
						<XAxis
							dataKey="date"
							tick={{ fontSize: 10, fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							domain={[minY, maxY]}
							tickFormatter={(v) => `$${v.toFixed(2)}`}
							tick={{ fontSize: 10, fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
							width={52}
						/>
						<Tooltip content={<CostTooltip />} />
						<Line
							type="monotone"
							dataKey="unit_price_before"
							name="Before"
							stroke="#d1d5db"
							strokeWidth={1.5}
							strokeDasharray="4 3"
							dot={false}
							connectNulls
							isAnimationActive
							animationDuration={1000}
							animationEasing="ease-out"
						/>
						<Line
							type="monotone"
							dataKey="unit_cost_after"
							name="After"
							stroke="#2563eb"
							strokeWidth={2}
							dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
							activeDot={{ r: 5, fill: "#2563eb" }}
							connectNulls
							isAnimationActive
							animationDuration={1000}
							animationEasing="ease-out"
						/>
					</LineChart>
				</ResponsiveContainer>
				<div className="mt-1 flex items-center gap-4 justify-end">
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-px w-5 border-t-2 border-dashed border-gray-300" />
						<span className="text-[10px] text-gray-400">Before</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-0.5 w-5 rounded-full bg-blue-600" />
						<span className="text-[10px] text-gray-400">After</span>
					</div>
				</div>
			</div>

			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<table className="min-w-full divide-y divide-gray-100">
					<thead className="bg-gray-50">
					<tr>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">PO #</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Before</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">After</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Δ</th>
					</tr>
					</thead>
					<tbody className="divide-y divide-gray-50">
					{[...history].reverse().map((r, i) => {
						const delta =
							r.unit_price_before != null
								? r.unit_cost_after - r.unit_price_before
								: null;
						const deltaUp = delta != null && delta > 0;
						const deltaDown = delta != null && delta < 0;

						return (
							<motion.tr
								key={r.id}
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: i * 0.04 } }}
								className="hover:bg-gray-50/50"
							>
								<td className="px-4 py-2.5 text-xs text-gray-600">
									{fmtDate(r.effective_date)}
								</td>
								<td className="px-4 py-2.5 font-mono text-xs text-gray-500">
									{r.po_number ?? "—"}
								</td>
								<td className="px-4 py-2.5 text-right tabular-nums text-xs text-gray-400">
									{r.unit_price_before != null ? `$${r.unit_price_before.toFixed(2)}` : "—"}
								</td>
								<td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-gray-800">
									${r.unit_cost_after.toFixed(2)}
								</td>
								<td className={`px-4 py-2.5 text-right tabular-nums text-xs font-medium ${deltaUp ? "text-red-500" : deltaDown ? "text-emerald-500" : "text-gray-400"}`}>
									{delta != null ? `${deltaUp ? "+" : ""}$${delta.toFixed(2)}` : "—"}
								</td>
							</motion.tr>
						);
					})}
					</tbody>
				</table>
			</div>
		</motion.div>
	);
}

// ─── Price History Tab ────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
	initial_set: { label: "Initial", color: "bg-blue-100 text-blue-700" },
	manual_edit: { label: "Manual", color: "bg-purple-100 text-purple-700" },
	bulk_markup: { label: "Bulk", color: "bg-amber-100 text-amber-700" },
};

function PriceHistoryTab({ itemId }: { itemId: number }) {
	const { data: history = [], isLoading } = useItemPriceHistory(itemId);
	const [batchFilter, setBatchFilter] = useState<string | null>(null);

	if (isLoading) return <TabSkeleton rows={5} />;
	if (history.length === 0)
		return <EmptyState message="No price history yet for this item." />;

	// Chart: oldest first
	const chartData = [...history].reverse().map((h) => ({
		date: fmtDateShort(h.created_at),
		price: Number(h.new_price),
	}));

	// Batch counts for "batch of N" badges
	const batchCounts = history.reduce<Record<string, number>>((acc, h) => {
		if (h.batch_id) acc[h.batch_id] = (acc[h.batch_id] ?? 0) + 1;
		return acc;
	}, {});

	const latest = history[0];
	const earliest = history[history.length - 1];
	const netChange =
		earliest.previous_price != null
			? latest.new_price - earliest.previous_price
			: null;
	const isUp = netChange != null && netChange > 0;
	const isDown = netChange != null && netChange < 0;

	const allValues = history.flatMap((h) =>
		[h.previous_price, h.new_price].filter((v): v is number => v != null)
	);
	const minY = Math.floor(Math.min(...allValues) * 0.95 * 100) / 100;
	const maxY = Math.ceil(Math.max(...allValues) * 1.05 * 100) / 100;

	const filtered = batchFilter
		? history.filter((h) => h.batch_id === batchFilter)
		: history;

	return (
		<div className="flex flex-col gap-5 p-6">
			{/* Summary cards */}
			<div className="flex gap-3">
				<div className="flex flex-col bg-white rounded-xl shadow-sm border border-zinc-200 px-4 py-3 flex-1">
					<span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
						Current Price
					</span>
					<span className="text-xl font-semibold tabular-nums text-gray-900">
						${Number(latest.new_price).toFixed(2)}
					</span>
				</div>
				<div className="flex flex-col bg-white rounded-xl shadow-sm border border-zinc-200 px-4 py-3 flex-1">
					<span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
						Changes
					</span>
					<span className="text-xl font-semibold tabular-nums text-gray-900">
						{history.length}
					</span>
				</div>
				{netChange != null && (
					<div className="flex flex-col bg-white rounded-xl shadow-sm border border-zinc-200 px-4 py-3 flex-1">
						<span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
							Net Change
						</span>
						<span className={`text-xl font-semibold tabular-nums ${isUp ? "text-red-500" : isDown ? "text-emerald-500" : "text-gray-900"}`}>
							{isUp ? "+" : ""}${netChange.toFixed(2)}
						</span>
					</div>
				)}
			</div>

			{/* Line chart */}
			<div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 pt-4 pb-2">
				<p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
					Transfer Price Over Time
				</p>
				<ResponsiveContainer width="100%" height={200}>
					<LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
						<XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
						<YAxis
							domain={[minY, maxY]}
							tickFormatter={(v) => `$${v.toFixed(2)}`}
							tick={{ fontSize: 10, fill: "#9ca3af" }}
							tickLine={false}
							axisLine={false}
							width={56}
						/>
						<Tooltip
							formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
							labelStyle={{ fontSize: 11 }}
							contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
						/>
						<Line
							type="monotone"
							dataKey="price"
							stroke="#6366f1"
							strokeWidth={2}
							dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
							activeDot={{ r: 5, fill: "#6366f1" }}
							connectNulls
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Batch filter active */}
			{batchFilter && (
				<div className="flex items-center gap-2 text-xs text-gray-500">
					<span>Filtered by batch</span>
					<button onClick={() => setBatchFilter(null)} className="underline text-blue-600">
						Clear
					</button>
				</div>
			)}

			{/* Change log */}
			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<table className="min-w-full divide-y divide-gray-100">
					<thead className="bg-gray-50">
					<tr>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
						<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Source</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Before</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">After</th>
						<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Δ</th>
					</tr>
					</thead>
					<tbody className="divide-y divide-gray-50">
					{filtered.map((row) => {
						const src = SOURCE_LABELS[row.change_source] ?? { label: row.change_source, color: "bg-gray-100 text-gray-600" };
						const delta = row.previous_price != null ? Number(row.new_price) - Number(row.previous_price) : null;
						const deltaUp = delta != null && delta > 0;
						const deltaDown = delta != null && delta < 0;
						const batchCount = row.batch_id ? batchCounts[row.batch_id] : null;

						return (
							<tr key={row.id} className="hover:bg-gray-50/50">
								<td className="px-4 py-2.5 text-xs text-gray-600">
									<div>{fmtDate(row.created_at)}</div>
									{row.change_reason && (
										<div className="text-[10px] text-gray-400 mt-0.5">{row.change_reason}</div>
									)}
								</td>
								<td className="px-4 py-2.5">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${src.color}`}>
											{src.label}
										</span>
										{batchCount && batchCount > 1 && (
											<button
												onClick={() => setBatchFilter(batchFilter === row.batch_id ? null : row.batch_id!)}
												className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
											>
												Batch ×{batchCount}
											</button>
										)}
									</div>
								</td>
								<td className="px-4 py-2.5 text-right tabular-nums text-xs text-gray-400">
									{row.previous_price != null ? `$${Number(row.previous_price).toFixed(2)}` : "—"}
								</td>
								<td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-gray-800">
									${Number(row.new_price).toFixed(2)}
								</td>
								<td className={`px-4 py-2.5 text-right tabular-nums text-xs font-medium ${deltaUp ? "text-red-500" : deltaDown ? "text-emerald-500" : "text-gray-400"}`}>
									{delta != null ? `${deltaUp ? "+" : ""}$${delta.toFixed(2)}` : "—"}
								</td>
							</tr>
						);
					})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// ─── Loading / Empty states ────────────────────────────────────────────────────

function TabSkeleton({ rows }: { rows: number }) {
	return (
		<div className="flex flex-col gap-3 p-6">
			{Array.from({ length: rows }).map((_, i) => (
				<div
					key={i}
					className="h-10 animate-pulse rounded-lg bg-zinc-800/60"
					style={{ opacity: 1 - i * 0.12 }}
				/>
			))}
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
			<svg
				className="h-8 w-8 text-zinc-700"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
				/>
			</svg>
			<p className="text-sm  ">{message}</p>
		</div>
	);
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function ItemDetailDrawer({
									 itemId,
									 warehouseLocationId,
									 open,
									 onClose,
								 }: ItemDetailDrawerProps) {
	const [activeTab, setActiveTab] = useState<Tab>("overview");
	const { data: overview } = useItemOverview(itemId, warehouseLocationId);

	// Reset to overview tab when item changes
	useEffect(() => {
		if (open) setActiveTab("overview");
	}, [itemId, open]);

	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, onClose]);

	const tabs: { id: Tab; label: string }[] = [
		{ id: "overview", label: "Overview" },
		{ id: "stock", label: "Stock" },
		{ id: "shipments", label: "Shipments" },
		{ id: "cost", label: "Cost History" },
		{ id: "price", label: "Price History" },
	];

	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop */}
					<motion.div
						key="backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1, transition: { duration: 0.2 } }}
						exit={{ opacity: 0, transition: { duration: 0.18 } }}
						className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
						onClick={onClose}
						aria-hidden="true"
					/>

					{/* Drawer panel */}
					<motion.div
						key="drawer"
						initial={{ x: "100%" }}
						animate={{ x: 0, transition: { type: "spring", damping: 25, stiffness: 300 } }}
						exit={{ x: "100%", transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } }}
						role="dialog"
						aria-modal="true"
						aria-label="Item detail"
						className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
					>
						{/* Header */}
						<div className="flex flex-shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
							<div className="flex flex-col gap-0.5 pr-8">
								{overview ? (
									<>
										<h2 className="text-base font-semibold leading-tight text-gray-900">
											{overview.item_name}
										</h2>
										{overview.sku && (
											<p className="font-mono text-xs text-gray-400">
												{overview.sku}
											</p>
										)}
									</>
								) : (
									<div className="flex flex-col gap-1.5">
										<div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
										<div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
									</div>
								)}
							</div>
							<button
								onClick={onClose}
								className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
								aria-label="Close drawer"
							>
								<svg
									className="h-4 w-4"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
								>
									<path strokeLinecap="round" d="M3 3l10 10M13 3L3 13" />
								</svg>
							</button>
						</div>

						{/* Tab bar */}
						<div className="flex flex-shrink-0 border-b border-gray-200 px-6 overflow-x-auto">
							{tabs.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`relative py-3 pr-5 text-sm font-medium whitespace-nowrap transition-colors ${
										activeTab === tab.id
											? "text-indigo-600"
											: "text-gray-500 hover:text-gray-800"
									}`}
								>
									{tab.label}
									{activeTab === tab.id && (
										<motion.span
											layoutId="tab-indicator"
											className="absolute bottom-0 left-0 right-5 h-0.5 rounded-full bg-indigo-600"
										/>
									)}
								</button>
							))}
						</div>

						{/* Tab content — scrollable */}
						<div className="flex-1 overflow-y-auto">
							{itemId && (
								<AnimatePresence mode="wait">
									<motion.div
										key={activeTab}
										initial={{ opacity: 0, x: 8 }}
										animate={{ opacity: 1, x: 0, transition: { duration: 0.2 } }}
										exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
									>
										{activeTab === "overview" && (
											<OverviewTab
												itemId={itemId}
												warehouseLocationId={warehouseLocationId}
											/>
										)}
										{activeTab === "stock" && <StockTab itemId={itemId} />}
										{activeTab === "shipments" && <ShipmentsTab itemId={itemId} />}
										{activeTab === "cost" && <CostHistoryTab itemId={itemId} />}
										{activeTab === "price" && <PriceHistoryTab itemId={itemId} />}
									</motion.div>
								</AnimatePresence>
							)}
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

export default ItemDetailDrawer;