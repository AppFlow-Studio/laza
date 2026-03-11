"use client";

import { useState, useMemo } from "react";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { useEmployeesByLocation } from "@/lib/hooks/queries/useEmployees";
import { useAlerts } from "@/lib/hooks/queries/useInventory";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import { ArrowLeft, Package, AlertTriangle, Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import SearchBar from "@/components/admin/shared/SearchBar";
import { Tables } from "@/lib/supabase/types";

type StorageSpace = Tables<"storage_spaces">;

export default function SuperAdminStoreDetailPage() {
	const params = useParams();
	const locationId = params.id as string;

	const { data: location, isLoading } = useLocationWithDetails(locationId);
	const { data: employees } = useEmployeesByLocation(locationId);
	const { data: alerts } = useAlerts({ resolved: false, locationId });

	const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

	const filteredEmployees = useMemo(() => {
		if (!employees) return [];
		if (!employeeSearchQuery) return employees;
		const query = employeeSearchQuery.toLowerCase();
		return employees.filter((employee) => {
			const fullName =
				employee.first_name && employee.last_name
					? `${employee.first_name} ${employee.last_name}`.toLowerCase()
					: (employee.first_name || "").toLowerCase();
			const email = (employee.email || "").toLowerCase();
			return fullName.includes(query) || email.includes(query);
		});
	}, [employees, employeeSearchQuery]);

	const activeAlertCount = alerts?.length ?? 0;

	if (isLoading) {
		return (
			<div className="space-y-4">
				<LoadingSkeleton className="h-12 w-64" />
				<LoadingSkeleton className="h-96 w-full" />
			</div>
		);
	}

	if (!location) {
		return (
			<div className="text-center py-12">
				<p className="text-zinc-500">Store not found</p>
				<Link href="/super-admin/stores">
					<Button className="mt-4">Back to Stores</Button>
				</Link>
			</div>
		);
	}

	const address =
		typeof location.address === "string"
			? JSON.parse(location.address)
			: location.address;

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<nav aria-label="Breadcrumb">
				<ol className="flex items-center text-sm text-zinc-600 space-x-2">
					<li>
						<Link
							href="/super-admin/stores"
							className="flex items-center hover:underline"
						>
							<ArrowLeft className="w-4 h-4 mr-1" />
							All Stores
						</Link>
					</li>
					<li>
						<span className="mx-2 text-zinc-400">/</span>
					</li>
					<li className="truncate font-semibold text-zinc-900">
						{location.name}
					</li>
				</ol>
			</nav>

			{/* Store header */}
			<div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
				<div className="flex items-start justify-between">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<h1 className="text-2xl font-semibold text-zinc-900">
								{location.name}
							</h1>
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                                <Eye className="w-3 h-3" />
                                Read-only
                            </span>
						</div>
						<p className="text-zinc-600">
							{address.street}, {address.city}, {address.state}{" "}
							{address.zip}
						</p>
					</div>

					{activeAlertCount > 0 && (
						<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
							<AlertTriangle className="w-4 h-4" />
							{activeAlertCount} active{" "}
							{activeAlertCount === 1 ? "alert" : "alerts"}
						</div>
					)}
				</div>

				{/* Quick stats */}
				<div className="flex gap-6 mt-4 pt-4 border-t border-zinc-100">
					<div>
						<p className="text-2xl font-semibold text-zinc-900">
							{location.storage_spaces?.length ?? 0}
						</p>
						<p className="text-xs text-zinc-500 mt-0.5">Storage Spaces</p>
					</div>
					<div>
						<p className="text-2xl font-semibold text-zinc-900">
							{employees?.length ?? 0}
						</p>
						<p className="text-xs text-zinc-500 mt-0.5">Employees</p>
					</div>
					{activeAlertCount > 0 && (
						<div>
							<p className="text-2xl font-semibold text-red-600">
								{activeAlertCount}
							</p>
							<p className="text-xs text-zinc-500 mt-0.5">Active Alerts</p>
						</div>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Storage Spaces — read-only, no Setup button */}
				<div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
					<h2 className="text-lg font-semibold text-zinc-900 mb-4">
						Storage Spaces
					</h2>

					{location.storage_spaces && location.storage_spaces.length > 0 ? (
						<div className="space-y-2">
							{location.storage_spaces.map((space: StorageSpace) => (
								<div
									key={space.id}
									className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg"
								>
									<div className="flex items-center gap-2">
										<Package className="w-4 h-4 text-zinc-400" />
										<span className="font-medium">{space.name}</span>
									</div>
									<span className="text-sm text-zinc-500 capitalize">
                                        {space.temperature_type}
                                    </span>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
							<p className="text-zinc-500">No storage spaces configured</p>
						</div>
					)}
				</div>

				{/* Employees — read-only */}
				<div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
					<h2 className="text-lg font-semibold text-zinc-900 mb-4">
						Employees
					</h2>

					{employees && employees.length > 0 ? (
						<>
							<div className="mb-4">
								<SearchBar
									placeholder="Search employees by name or email…"
									onSearch={setEmployeeSearchQuery}
								/>
							</div>
							{filteredEmployees.length > 0 ? (
								<div className="space-y-2">
									{filteredEmployees.map((employee) => (
										<div
											key={employee.id}
											className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg"
										>
											<div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
												{employee.first_name?.[0] ||
													employee.email[0]?.toUpperCase() ||
													"U"}
											</div>
											<div className="min-w-0">
												<p className="font-medium truncate">
													{employee.first_name && employee.last_name
														? `${employee.first_name} ${employee.last_name}`
														: employee.first_name || employee.email}
												</p>
												<p className="text-xs text-zinc-500 truncate">
													{employee.email}
												</p>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-zinc-500 text-center py-4">
									No employees match your search
								</p>
							)}
						</>
					) : (
						<p className="text-zinc-500">No employees assigned</p>
					)}
				</div>
			</div>

			{/* Active Alerts — only shown when alerts exist */}
			{activeAlertCount > 0 && (
				<div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
					<h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
						<AlertTriangle className="w-5 h-5 text-red-500" />
						Active Low Stock Alerts
					</h2>
					<div className="space-y-2">
						{alerts?.map((alert: any) => (
							<div
								key={alert.id}
								className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
							>
								<div>
									<p className="font-medium text-zinc-900 text-sm">
										{alert.items?.name ?? "Unknown item"}
									</p>
									{alert.storage_spaces?.name && (
										<p className="text-xs text-zinc-500 mt-0.5">
											{alert.storage_spaces.name}
										</p>
									)}
								</div>
								<span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full capitalize">
                                    {alert.alert_type?.replace("_", " ") ?? "low stock"}
                                </span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}