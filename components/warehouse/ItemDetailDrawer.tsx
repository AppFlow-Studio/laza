"use client";

import { useState, useEffect } from "react";
import {
	motion,
	AnimatePresence,
	useMotionValue,
	useTransform,
	animate,
} from "framer-motion";
import {
	useItemOverview,
	useItemPalletStock,
	useItemBoxTotals,
	useItemShipmentHistory,
	useItemCostHistory,
} from "@/lib/hooks/queries/useItemDetail";
import { useItemPriceHistory } from "@/lib/hooks/queries/useItemPriceHistory";
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

function fmtDateCompact(s: string | null) {
	if (!s) return "—";
	return new Date(s).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

// ─── Utility Components ───────────────────────────────────────────────────────

function CountUp({
	to,
	decimals = 0,
	prefix = "",
	suffix = "",
}: {
	to: number;
	decimals?: number;
	prefix?: string;
	suffix?: string;
}) {
	const motionVal = useMotionValue(0);
	const display = useTransform(motionVal, (v) =>
		`${prefix}${v.toLocaleString("en-US", {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		})}${suffix}`
	);

	useEffect(() => {
		const controls = animate(motionVal, to, { duration: 0.7, ease: "easeOut" });
		return controls.stop;
	}, [to, motionVal]);

	return <motion.span>{display}</motion.span>;
}

function TrendArrow({ up }: { up: boolean }) {
	return (
		<svg className="inline-block h-2.5 w-2.5 flex-shrink-0" viewBox="0 0 10 10" fill="currentColor">
			{up
				? <path d="M5 1.5L9.5 8.5H0.5L5 1.5Z" />
				: <path d="M5 8.5L0.5 1.5H9.5L5 8.5Z" />
			}
		</svg>
	);
}

function StatusBadge({ status }: { status: string }) {
	const variants: Record<string, string> = {
		active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
		empty: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
		retired: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
	};
	return (
		<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${variants[status] ?? variants.retired}`}>
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
	const { data: overview, isLoading } = useItemOverview(itemId, warehouseLocationId);

	if (isLoading) return <TabSkeleton rows={6} />;
	if (!overview) return <EmptyState message="Could not load item overview." />;

	const regularStats = [
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
		<div className="flex flex-col gap-5 p-6">
			{/* Hero stat cards */}
			<div className="grid grid-cols-2 gap-3">
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } }}
					className="flex flex-col gap-1.5 rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm shadow-indigo-100/40"
				>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
						Warehouse Boxes
					</span>
					<span className="text-2xl font-bold tabular-nums text-indigo-700">
						{overview.warehouse_boxes != null
							? <CountUp to={overview.warehouse_boxes} />
							: "—"}
					</span>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: 0.04, ease: [0.25, 0.1, 0.25, 1] } }}
					className="flex flex-col gap-1.5 rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm shadow-indigo-100/40"
				>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
						Total Pieces
					</span>
					<span className="text-2xl font-bold tabular-nums text-indigo-700">
						{overview.warehouse_pieces != null
							? <CountUp to={overview.warehouse_pieces} />
							: "—"}
					</span>
				</motion.div>
			</div>

			{/* Secondary stat cards */}
			<div className="grid grid-cols-2 gap-3">
				{regularStats.map((s, i) => (
					<motion.div
						key={s.label}
						initial={{ opacity: 0, y: 8 }}
						animate={{
							opacity: 1,
							y: 0,
							transition: { duration: 0.22, delay: (i + 2) * 0.04, ease: [0.25, 0.1, 0.25, 1] },
						}}
						className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-4"
					>
						<span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
							{s.label}
						</span>
						<span className="text-xl font-semibold tabular-nums text-gray-900">
							{s.value}
						</span>
					</motion.div>
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

	const grouped = pallets.reduce<Record<string, typeof pallets>>((acc, p) => {
		const key = p.storage_space_name ?? "";
		if (!acc[key]) acc[key] = [];
		acc[key].push(p);
		return acc;
	}, {});

	// Pre-calculate global row indices for stagger
	let startIndex = 0;
	const groupsWithIdx = Object.entries(grouped).map(([spaceName, rows]) => {
		const groupStart = startIndex;
		startIndex += rows.length;
		return { spaceName, rows, groupStart };
	});

	return (
		<div className="flex flex-col gap-4 p-6">
			{groupsWithIdx.map(({ spaceName, rows, groupStart }) => {
				const totalBoxes = rows.reduce((s, r) => s + r.box_count, 0);
				const totalPieces = rows.reduce((s, r) => s + r.total_pieces, 0);

				return (
					<div
						key={spaceName}
						className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
					>
						{/* Group header */}
						<div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
								{spaceName}
							</span>
							<div className="flex items-center gap-2">
								<span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200/60">
									{fmt(totalBoxes)} boxes
								</span>
								<span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
									{fmt(totalPieces)} pcs
								</span>
							</div>
						</div>

						<table className="min-w-full">
							<thead>
								<tr className="border-b border-gray-50">
									<th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
										Pallet
									</th>
									<th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
										Boxes
									</th>
									<th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
										Pcs/Box
									</th>
									<th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
										Total Pcs
									</th>
									<th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{rows.map((p, localIdx) => (
									<motion.tr
										key={p.pallet_id}
										initial={{ opacity: 0, y: 4 }}
										animate={{
											opacity: 1,
											y: 0,
											transition: {
												duration: 0.2,
												delay: (groupStart + localIdx) * 0.03,
												ease: [0.25, 0.1, 0.25, 1],
											},
										}}
										className="transition-colors duration-100 hover:bg-indigo-50/30"
									>
										<td className="px-4 py-2.5 font-mono text-xs font-medium text-gray-700">
											{p.pallet_label}
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums text-xs text-gray-600">
											{fmt(p.box_count)}
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums text-xs text-gray-600">
											{p.has_mixed_configs ? "mixed" : fmt(p.effective_pieces_per_box)}
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-gray-800">
											{fmt(p.total_pieces)}
										</td>
										<td className="px-4 py-2.5 text-right">
											<StatusBadge status={p.status} />
										</td>
									</motion.tr>
								))}
							</tbody>
						</table>
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
				initial={{ opacity: 0, y: 6 }}
				animate={{
					opacity: 1,
					y: 0,
					transition: { duration: 0.22, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] },
				}}
				className="cursor-pointer border-b border-gray-100 transition-colors duration-100 last:border-0 hover:bg-blue-50/25"
				onClick={() => setExpanded((v) => !v)}
			>
				<td className="px-4 py-3 whitespace-nowrap">
					<div className="flex items-center gap-2">
						<motion.svg
							animate={{ rotate: expanded ? 90 : 0 }}
							transition={{ duration: 0.18 }}
							className="h-3 w-3 flex-shrink-0 text-gray-400"
							viewBox="0 0 12 12"
							fill="currentColor"
						>
							<path
								d="M4 2l4 4-4 4"
								stroke="currentColor"
								strokeWidth="1.5"
								fill="none"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</motion.svg>
						<span className="text-xs font-semibold text-gray-800">
							{record.po_number}
						</span>
						{record.has_mixed_configs && (
							<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-200/80">
								MIXED
							</span>
						)}
					</div>
				</td>
				<td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{fmtDateCompact(record.po_date)}</td>
				<td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{fmtDateCompact(record.actual_arrival)}</td>
				<td className="px-2 py-3 text-right tabular-nums text-xs text-gray-700">
					{fmt(record.po_line_total_boxes)}
				</td>
				<td className="px-2 py-3 text-right tabular-nums text-xs text-gray-700">
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
						initial={{ opacity: 0 }}
						animate={{ opacity: 1, transition: { duration: 0.18 } }}
						exit={{ opacity: 0, transition: { duration: 0.14 } }}
					>
						<td colSpan={6} className="border-b border-gray-100 bg-slate-50/60 px-8 py-4">
							<div className="flex flex-col gap-2.5">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
									Box Configuration Breakdown
								</p>
								<div className="overflow-hidden rounded-lg border border-gray-200 bg-white ring-1 ring-gray-100/80">
									<table className="min-w-full">
										<thead>
											<tr className="border-b border-gray-100 bg-gray-50/80">
												<th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
													Pcs / Box
												</th>
												<th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
													Boxes
												</th>
												<th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
													Total Pcs
												</th>
												<th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
													Notes
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-50">
											{record.box_configs && record.box_configs.length > 0 ? (
												record.box_configs.map((cfg, i) => (
													<tr
														key={i}
														className="transition-colors duration-100 hover:bg-indigo-50/30"
													>
														<td className="px-3 py-2 tabular-nums text-xs text-gray-700">
															{fmt(cfg.pieces_per_box)}
														</td>
														<td className="px-3 py-2 text-right tabular-nums text-xs text-gray-700">
															{fmt(cfg.box_count)}
														</td>
														<td className="px-3 py-2 text-right text-xs font-medium text-gray-800">
															{fmt(cfg.total_pieces)}
														</td>
														<td className="px-3 py-2 text-xs text-gray-400">
															{cfg.notes ?? <span className="text-gray-300">—</span>}
														</td>
													</tr>
												))
											) : record.config_pieces_per_box != null ? (
												<tr className="transition-colors duration-100 hover:bg-indigo-50/30">
													<td className="px-3 py-2 tabular-nums text-xs text-gray-700">
														{fmt(record.config_pieces_per_box)}
													</td>
													<td className="px-3 py-2 text-right tabular-nums text-xs text-gray-700">
														{fmt(record.config_box_count)}
													</td>
													<td className="px-3 py-2 text-right text-xs font-medium text-gray-800">
														{fmt(record.config_total_pieces)}
													</td>
													<td className="px-3 py-2 text-xs text-gray-400">
														{record.config_notes ?? <span className="text-gray-300">—</span>}
													</td>
												</tr>
											) : (
												<tr>
													<td colSpan={4} className="px-3 py-3 text-xs italic text-amber-600">
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

	const summaryCards = [
		{ label: "Weighted Avg", value: `${fmt(totals?.weighted_avg_per_box, 1)} pcs/box`, accent: false },
		{ label: "Total Received", value: `${fmt(totals?.total_boxes_received)} boxes`, accent: false },
		{ label: "Shipments", value: String(totals?.shipment_count ?? shipments.length), accent: true },
	];

	return (
		<div className="flex flex-col gap-4 p-6">
			{totals && (
				<div className="grid grid-cols-3 gap-3">
					{summaryCards.map((s, i) => (
						<motion.div
							key={s.label}
							initial={{ opacity: 0, y: 6 }}
							animate={{
								opacity: 1,
								y: 0,
								transition: { duration: 0.22, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] },
							}}
							className={`flex flex-col gap-1 rounded-xl px-4 py-3 ${
								s.accent
									? "border border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white shadow-sm shadow-indigo-100/40"
									: "border border-gray-200 bg-gray-50/60"
							}`}
						>
							<span className={`text-[10px] font-semibold uppercase tracking-wider ${s.accent ? "text-indigo-500" : "text-gray-400"}`}>
								{s.label}
							</span>
							<span className={`tabular-nums font-semibold ${s.accent ? "text-xl text-indigo-700" : "text-lg text-gray-900"}`}>
								{s.value}
							</span>
						</motion.div>
					))}
				</div>
			)}

			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<table className="min-w-full">
					<thead>
						<tr className="border-b border-gray-100 bg-gray-50/80">
							<th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">PO #</th>
							<th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">PO Date</th>
							<th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Arrived</th>
							<th className="px-2 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Boxes</th>
							<th className="px-2 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Pcs/Box</th>
							<th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Pcs</th>
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
		<div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg">
			<p className="mb-1.5 text-[11px] font-semibold text-gray-700">{label}</p>
			{before?.value != null && (
				<p className="text-[11px] text-gray-400">
					Before: <span className="font-mono font-medium text-gray-600">${before.value.toFixed(2)}</span>
				</p>
			)}
			{after?.value != null && (
				<p className="text-[11px] text-indigo-600">
					After: <span className="font-mono font-semibold">${after.value.toFixed(2)}</span>
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
	const avgCost = allValues.length > 0
		? allValues.reduce((a, b) => a + b, 0) / allValues.length
		: null;

	return (
		<motion.div
			initial={{ opacity: 0, x: 12 }}
			animate={{ opacity: 1, x: 0, transition: { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] } }}
			className="flex flex-col gap-5 p-6"
		>
			{/* Summary cards */}
			<div className="grid grid-cols-3 gap-3">
				{/* Hero: Current Cost */}
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } }}
					className="flex flex-col gap-1.5 rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm shadow-indigo-100/40"
				>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
						Current Cost
					</span>
					<span className="text-xl font-bold tabular-nums text-indigo-700">
						<CountUp to={latest.unit_cost_after} decimals={2} prefix="$" />
					</span>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: 0.06, ease: [0.25, 0.1, 0.25, 1] } }}
					className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-4"
				>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
						Changes
					</span>
					<span className="text-xl font-semibold tabular-nums text-gray-900">
						{history.length}
					</span>
				</motion.div>

				{totalChange != null && (
					<motion.div
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] } }}
						className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-4"
					>
						<span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
							Net Change
						</span>
						<span className={`flex items-center gap-1 text-xl font-semibold tabular-nums ${isUp ? "text-red-500" : isDown ? "text-emerald-500" : "text-gray-900"}`}>
							{(isUp || isDown) && <TrendArrow up={isUp} />}
							{isUp ? "+" : ""}${Math.abs(totalChange).toFixed(2)}
						</span>
					</motion.div>
				)}
			</div>

			{/* Chart */}
			<div className="rounded-xl border border-gray-200 bg-white px-4 pb-3 pt-4 shadow-sm">
				<p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
					Unit Cost Over Time
				</p>
				<ResponsiveContainer width="100%" height={200}>
					<LineChart
						key={chartKey}
						data={chartData}
						margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
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
						{avgCost != null && (
							<ReferenceLine
								y={avgCost}
								stroke="#d1d5db"
								strokeDasharray="3 3"
								label={{
									value: `avg $${avgCost.toFixed(2)}`,
									position: "insideTopRight",
									fontSize: 9,
									fill: "#9ca3af",
								}}
							/>
						)}
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
							stroke="#4f46e5"
							strokeWidth={2}
							dot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }}
							activeDot={{ r: 5, fill: "#4f46e5" }}
							connectNulls
							isAnimationActive
							animationDuration={1000}
							animationEasing="ease-out"
						/>
					</LineChart>
				</ResponsiveContainer>
				<div className="mt-2 flex items-center justify-end gap-4">
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-px w-5 border-t-2 border-dashed border-gray-300" />
						<span className="text-[10px] text-gray-400">Before</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-0.5 w-5 rounded-full bg-indigo-600" />
						<span className="text-[10px] text-gray-400">After</span>
					</div>
				</div>
			</div>

			{/* Change log */}
			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<table className="min-w-full divide-y divide-gray-100">
					<thead className="bg-gray-50/80">
						<tr>
							<th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Date</th>
							<th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">PO #</th>
							<th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Before</th>
							<th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">After</th>
							<th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Δ</th>
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
									animate={{
										opacity: 1,
										y: 0,
										transition: { duration: 0.2, delay: i * 0.04, ease: [0.25, 0.1, 0.25, 1] },
									}}
									className="transition-colors hover:bg-gray-50/60"
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
									<td className={`px-4 py-2.5 text-right text-xs font-medium ${deltaUp ? "text-red-500" : deltaDown ? "text-emerald-500" : "text-gray-400"}`}>
										{delta != null ? (
											<span className="inline-flex items-center justify-end gap-1 tabular-nums">
												{(deltaUp || deltaDown) && <TrendArrow up={deltaUp} />}
												{deltaUp ? "+" : ""}${Math.abs(delta).toFixed(2)}
											</span>
										) : "—"}
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
	initial_set: { label: "Initial", color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60" },
	manual_edit: { label: "Manual", color: "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60" },
	bulk_markup: { label: "Bulk", color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60" },
};

function PriceHistoryTab({ itemId }: { itemId: number }) {
	const { data: history = [], isLoading } = useItemPriceHistory(itemId);
	const [batchFilter, setBatchFilter] = useState<string | null>(null);

	if (isLoading) return <TabSkeleton rows={5} />;
	if (history.length === 0)
		return <EmptyState message="No price history yet for this item." />;

	const chartData = [...history].reverse().map((h) => ({
		date: fmtDateShort(h.created_at),
		price: Number(h.new_price),
	}));

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
				{/* Hero: Current Price */}
				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } }}
					className="flex flex-1 flex-col gap-1.5 rounded-xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm shadow-indigo-100/40"
				>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
						Current Price
					</span>
					<span className="text-xl font-bold tabular-nums text-indigo-700">
						<CountUp to={Number(latest.new_price)} decimals={2} prefix="$" />
					</span>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: 0.06, ease: [0.25, 0.1, 0.25, 1] } }}
					className="flex flex-1 flex-col gap-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-4"
				>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
						Changes
					</span>
					<span className="text-xl font-semibold tabular-nums text-gray-900">
						{history.length}
					</span>
				</motion.div>

				{netChange != null && (
					<motion.div
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] } }}
						className="flex flex-1 flex-col gap-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-4"
					>
						<span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
							Net Change
						</span>
						<span className={`flex items-center gap-1 text-xl font-semibold tabular-nums ${isUp ? "text-red-500" : isDown ? "text-emerald-500" : "text-gray-900"}`}>
							{(isUp || isDown) && <TrendArrow up={isUp} />}
							{isUp ? "+" : ""}${Math.abs(netChange).toFixed(2)}
						</span>
					</motion.div>
				)}
			</div>

			{/* Chart */}
			<div className="rounded-xl border border-gray-200 bg-white px-4 pb-3 pt-4 shadow-sm">
				<p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
					Transfer Price Over Time
				</p>
				<ResponsiveContainer width="100%" height={200}>
					<LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
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
							width={56}
						/>
						<Tooltip
							formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
							labelStyle={{ fontSize: 11 }}
							contentStyle={{
								fontSize: 12,
								borderRadius: 8,
								border: "1px solid #e5e7eb",
								boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
							}}
						/>
						<Line
							type="monotone"
							dataKey="price"
							stroke="#6366f1"
							strokeWidth={2}
							dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
							activeDot={{ r: 5, fill: "#6366f1" }}
							connectNulls
							isAnimationActive
							animationDuration={900}
							animationEasing="ease-out"
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Active batch filter chip */}
			<AnimatePresence>
				{batchFilter && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1, transition: { duration: 0.15 } }}
						exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
					>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
							Batch filter active
							<button
								onClick={() => setBatchFilter(null)}
								className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-indigo-200/60"
								aria-label="Clear batch filter"
							>
								<svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
									<path d="M2 2l8 8M10 2L2 10" />
								</svg>
							</button>
						</span>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Change log */}
			<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<table className="min-w-full divide-y divide-gray-100">
					<thead className="bg-gray-50/80">
						<tr>
							<th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Date</th>
							<th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Source</th>
							<th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Before</th>
							<th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">After</th>
							<th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Δ</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-50">
						{filtered.map((row) => {
							const src = SOURCE_LABELS[row.change_source] ?? {
								label: row.change_source,
								color: "bg-gray-100 text-gray-600",
							};
							const delta =
								row.previous_price != null
									? Number(row.new_price) - Number(row.previous_price)
									: null;
							const deltaUp = delta != null && delta > 0;
							const deltaDown = delta != null && delta < 0;
							const batchCount = row.batch_id ? batchCounts[row.batch_id] : null;

							return (
								<tr key={row.id} className="transition-colors hover:bg-gray-50/60">
									<td className="px-4 py-2.5 text-xs text-gray-600">
										<div>{fmtDate(row.created_at)}</div>
										{row.change_reason && (
											<div className="mt-0.5 text-[10px] text-gray-400">{row.change_reason}</div>
										)}
									</td>
									<td className="px-4 py-2.5">
										<div className="flex flex-wrap items-center gap-1.5">
											<span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${src.color}`}>
												{src.label}
											</span>
											{batchCount && batchCount > 1 && (
												<button
													onClick={() =>
														setBatchFilter(
															batchFilter === row.batch_id ? null : row.batch_id!
														)
													}
													className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
														batchFilter === row.batch_id
															? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
															: "bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"
													}`}
												>
													Batch ×{batchCount}
												</button>
											)}
										</div>
									</td>
									<td className="px-4 py-2.5 text-right tabular-nums text-xs text-gray-400">
										{row.previous_price != null
											? `$${Number(row.previous_price).toFixed(2)}`
											: "—"}
									</td>
									<td className="px-4 py-2.5 text-right tabular-nums text-xs font-semibold text-gray-800">
										${Number(row.new_price).toFixed(2)}
									</td>
									<td className={`px-4 py-2.5 text-right text-xs font-medium ${deltaUp ? "text-red-500" : deltaDown ? "text-emerald-500" : "text-gray-400"}`}>
										{delta != null ? (
											<span className="inline-flex items-center justify-end gap-1 tabular-nums">
												{(deltaUp || deltaDown) && <TrendArrow up={deltaUp} />}
												{deltaUp ? "+" : ""}${Math.abs(delta).toFixed(2)}
											</span>
										) : "—"}
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
					className="h-10 animate-pulse rounded-lg bg-gray-200"
					style={{ opacity: 1 - i * 0.12 }}
				/>
			))}
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2.5 py-16 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
				<svg
					className="h-5 w-5 text-gray-300"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={1.5}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
					/>
				</svg>
			</div>
			<p className="text-sm text-gray-400">{message}</p>
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

	useEffect(() => {
		if (open) setActiveTab("overview");
	}, [itemId, open]);

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
						className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
						onClick={onClose}
						aria-hidden="true"
					/>

					{/* Drawer */}
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
						<div className="relative flex flex-shrink-0 items-start justify-between border-b border-gray-100 bg-gradient-to-b from-gray-50/60 to-white px-6 py-5">
							{/* Left accent bar */}
							<div className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full bg-indigo-500" />

							<div className="flex flex-col gap-1.5 pl-4 pr-8">
								{overview ? (
									<>
										{(overview.category_name || overview.short_label) && (
											<div className="flex flex-wrap items-center gap-1.5">
												{overview.category_name && (
													<span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200/60">
														{overview.category_name}
													</span>
												)}
												{overview.short_label && (
													<span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
														{overview.short_label}
													</span>
												)}
											</div>
										)}
										<h2 className="text-[17px] font-semibold leading-tight tracking-tight text-gray-900">
											{overview.item_name}
										</h2>
										{overview.sku && (
											<p className="font-mono text-[11px] text-gray-400">
												SKU · {overview.sku}
											</p>
										)}
									</>
								) : (
									<div className="flex flex-col gap-2">
										<div className="h-3 w-20 animate-pulse rounded-full bg-gray-200" />
										<div className="h-5 w-44 animate-pulse rounded-lg bg-gray-200" />
										<div className="h-3 w-24 animate-pulse rounded-full bg-gray-200" />
									</div>
								)}
							</div>

							<button
								onClick={onClose}
								className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
								aria-label="Close drawer"
							>
								<svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
									<path strokeLinecap="round" d="M3 3l10 10M13 3L3 13" />
								</svg>
							</button>
						</div>

						{/* Tab bar */}
						<div className="flex flex-shrink-0 overflow-x-auto border-b border-gray-100 px-6">
							{tabs.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`relative py-3.5 pr-5 text-[13px] whitespace-nowrap transition-colors duration-150 ${
										activeTab === tab.id
											? "font-semibold text-indigo-600"
											: "font-medium text-gray-400 hover:text-gray-700"
									}`}
								>
									{tab.label}
									{activeTab === tab.id && (
										<motion.span
											layoutId="tab-indicator"
											className="absolute bottom-0 left-0 right-5 h-0.5 rounded-full bg-indigo-600"
											transition={{ type: "spring", stiffness: 400, damping: 30 }}
										/>
									)}
								</button>
							))}
						</div>

						{/* Tab content */}
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
											<OverviewTab itemId={itemId} warehouseLocationId={warehouseLocationId} />
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
