//super-admin/warehouse/[palletId]
"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MoveRight } from "lucide-react";
import { usePallet, usePalletOperationsLog } from "@/lib/hooks/queries/usePallets";
import { PalletStatusBadge } from "@/components/pallets/PalletStatusBadge";
import { FillLevelBar } from "@/components/pallets/FillLevelBar";
import { PalletContentsTable } from "@/components/pallets/PalletContentsTable";
import { PalletActivityLog } from "@/components/pallets/PalletActivityLog";
import { format } from "date-fns";

export default function PalletDetailPage() {
	const { palletId } = useParams<{ palletId: string }>();
	const router = useRouter();

	const { data: pallet, isLoading } = usePallet(palletId);
	const { data: activityLog, isLoading: logLoading } = usePalletOperationsLog(palletId);

	if (isLoading) {
		return <PalletDetailSkeleton />;
	}

	if (!pallet) {
		return (
			<div className="p-6 text-center text-sm text-gray-500">
				Pallet not found.
			</div>
		);
	}

	const totalCapacity = (pallet.pallet_inventory ?? []).reduce(
		(s: number, r: { initial_box_count: number }) => s + (r.initial_box_count ?? 0),
		0
	);

	const params = new URLSearchParams({
		source:    pallet.id,
		warehouse: pallet.warehouse_location_id,
	});

	return (
		<div className="flex flex-col gap-6 p-6">
			{/* ── Header ── */}
			<div className="flex items-center gap-3">
				<button
					onClick={() => router.back()}
					className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<div className="flex flex-1 items-center gap-3">
					<h1 className="font-mono text-2xl font-semibold text-gray-900">
						{pallet.pallet_label}
					</h1>
					<PalletStatusBadge status={pallet.status as "active" | "empty" | "retired"} />
				</div>
				<button
					onClick={() =>
						router.push(`/super-admin/warehouse/pallets/reorganize?${params.toString()}`)
					}
					className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
				>
					<MoveRight className="h-4 w-4" />
					Move Items
				</button>
			</div>

			{/* ── Info Cards ── */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{/* Source PO */}
				<InfoCard label="Source Shipment">
					{pallet.purchase_orders ? (
						<button
							onClick={() =>
								router.push(`/super-admin/purchase-orders/${pallet.purchase_order_id}`)
							}
							className="text-left"
						>
							<p className="text-sm font-semibold text-indigo-600 hover:underline">
								{pallet.purchase_orders.po_number}
							</p>
							{pallet.purchase_orders.supplier_name && (
								<p className="text-xs text-gray-500">{pallet.purchase_orders.supplier_name}</p>
							)}
							{pallet.received_at && (
								<p className="text-xs text-gray-400">
									{format(new Date(pallet.received_at), "MMM d, yyyy")}
								</p>
							)}
						</button>
					) : (
						<span className="text-sm text-gray-400">No PO linked</span>
					)}
				</InfoCard>

				{/* Capacity */}
				<InfoCard label="Capacity">
					<div className="flex flex-col gap-2">
						<span className="text-xl font-semibold text-gray-900">
							{pallet.total_boxes}
							<span className="text-sm font-normal text-gray-400">
								/{totalCapacity} boxes
							</span>
						</span>
						<FillLevelBar
							current={pallet.total_boxes}
							capacity={totalCapacity}
							showLabel={false}
						/>
					</div>
				</InfoCard>

				{/* Status */}
				<InfoCard label="Status">
					<div className="flex flex-col gap-1">
						<PalletStatusBadge status={pallet.status as "active" | "empty" | "retired"} />
						<span className="text-xs text-gray-400">
							Updated{" "}
							{pallet.updated_at
								? format(new Date(pallet.updated_at), "MMM d, yyyy")
								: "—"}
						</span>
					</div>
				</InfoCard>
			</div>

			{/* ── Contents + Activity ── */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<PalletContentsTable inventory={pallet.pallet_inventory ?? []} />
				</div>
				<div>
					<PalletActivityLog log={activityLog ?? []} isLoading={logLoading} />
				</div>
			</div>
		</div>
	);
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
			<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
				{label}
			</p>
			{children}
		</div>
	);
}

function PalletDetailSkeleton() {
	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-center gap-3">
				<div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
				<div className="h-7 w-48 animate-pulse rounded-lg bg-gray-100" />
			</div>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
				))}
			</div>
			<div className="h-64 animate-pulse rounded-xl bg-gray-100" />
		</div>
	);
}