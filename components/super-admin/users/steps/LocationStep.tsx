"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, MapPin, ShieldCheck, Store, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import { Location } from '@/lib/supabase/types';

const locationSchema = z.object({
	assigned_location_id: z.string().nullable().optional(),
	assigned_location_ids: z.array(z.string()).optional(),
});

export type LocationStepData = z.infer<typeof locationSchema>;

interface LocationStepProps {
	role: 'super_admin' | 'admin' | 'employee';
	defaultValues?: LocationStepData | null;
	onSubmit: (data: LocationStepData) => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getLocationType(location: Location): 'store' | 'warehouse' {
	return (location as any).location_type === 'warehouse' ? 'warehouse' : 'store';
}

const TYPE_CONFIG = {
	store: {
		icon: Store,
		label: 'Store',
		badge: 'bg-indigo-50 text-indigo-600 border-indigo-100',
		iconColor: 'text-indigo-500',
		iconBg: 'bg-indigo-50',
	},
	warehouse: {
		icon: Warehouse,
		label: 'Warehouse',
		badge: 'bg-amber-50 text-amber-700 border-amber-100',
		iconColor: 'text-amber-600',
		iconBg: 'bg-amber-50',
	},
} as const;

interface LocationRowProps {
	location: Location;
	isSelected: boolean;
	mode: 'radio' | 'checkbox';
	onClick: () => void;
}

function LocationRow({ location, isSelected, mode, onClick }: LocationRowProps) {
	const type = getLocationType(location);
	const config = TYPE_CONFIG[type];
	const Icon = config.icon;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
				isSelected ? "bg-indigo-50" : "hover:bg-zinc-50"
			)}
		>
			{/* Checkbox or radio indicator */}
			{mode === 'checkbox' ? (
				<div className={cn(
					"w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
					isSelected ? "bg-indigo-500 border-indigo-500" : "border-zinc-300"
				)}>
					{isSelected && <Check className="w-3 h-3 text-white" />}
				</div>
			) : (
				<div className={cn(
					"w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
					isSelected ? "border-indigo-500" : "border-zinc-300"
				)}>
					{isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
				</div>
			)}

			{/* Location type icon */}
			<div className={cn("p-1.5 rounded-lg flex-shrink-0", config.iconBg)}>
				<Icon className={cn("w-3.5 h-3.5", config.iconColor)} />
			</div>

			{/* Name + city */}
			<div className="flex-1 min-w-0">
				<p className={cn(
					"text-sm font-medium",
					isSelected ? "text-indigo-900" : "text-zinc-800"
				)}>
					{location.name}
				</p>
				{(location.address as any)?.city && (
					<p className="text-xs text-zinc-400 mt-0.5">
						{(location.address as any).city}, {(location.address as any).state}
					</p>
				)}
			</div>

			{/* Type badge */}
			<span className={cn(
				"flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-md border",
				config.badge
			)}>
                {config.label}
            </span>
		</button>
	);
}

// ─── main component ──────────────────────────────────────────────────────────

export default function LocationStep({ role, defaultValues, onSubmit }: LocationStepProps) {
	const { data: locations } = useLocations();

	// Show ALL locations — stores and warehouse — sorted: stores first, then warehouse
	const allLocations = [...(locations ?? [])].sort((a, b) => {
		const aType = getLocationType(a);
		const bType = getLocationType(b);
		if (aType === bType) return a.name.localeCompare(b.name);
		return aType === 'store' ? -1 : 1;
	});

	const { handleSubmit, watch, setValue } = useForm<LocationStepData>({
		resolver: zodResolver(locationSchema),
		defaultValues: defaultValues || {
			assigned_location_id: null,
			assigned_location_ids: [],
		},
	});

	const selectedLocationIds = watch('assigned_location_ids') ?? [];
	const selectedLocationId = watch('assigned_location_id');

	const toggleLocation = (locationId: string) => {
		const updated = selectedLocationIds.includes(locationId)
			? selectedLocationIds.filter((id) => id !== locationId)
			: [...selectedLocationIds, locationId];
		setValue('assigned_location_ids', updated);
	};

	// ── Super Admin ──────────────────────────────────────────────────────────
	if (role === 'super_admin') {
		return (
			<form
				id="location-step-form"
				onSubmit={(e) => {
					e.preventDefault();
					onSubmit({ assigned_location_id: null, assigned_location_ids: [] });
				}}
				className="space-y-4"
			>
				<div>
					<h2 className="text-base font-semibold text-zinc-900">Access level</h2>
					<p className="text-sm text-zinc-500 mt-0.5">
						Super Admins are not scoped to specific locations.
					</p>
				</div>

				<div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 flex flex-col items-center text-center gap-3">
					<div className="p-3 bg-amber-100 rounded-full">
						<ShieldCheck className="w-6 h-6 text-amber-600" />
					</div>
					<div>
						<p className="font-semibold text-amber-900 text-sm">Full System Access</p>
						<p className="text-xs text-amber-700 mt-1 leading-relaxed max-w-xs">
							This user will have access to all stores, the warehouse, all order tickets, analytics, and organization settings.
						</p>
					</div>
				</div>

				<div className="space-y-2">
					{[
						'All store locations',
						'Warehouse management',
						'Order ticket fulfillment',
						'Cross-store analytics',
						'Organization settings',
					].map((item) => (
						<div key={item} className="flex items-center gap-2 text-sm text-zinc-700">
							<Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
							{item}
						</div>
					))}
				</div>
			</form>
		);
	}

	// ── Employee: single location required ───────────────────────────────────
	if (role === 'employee') {
		return (
			<form
				id="location-step-form"
				onSubmit={handleSubmit((data) => {
					if (!data.assigned_location_id) return;
					onSubmit(data);
				})}
				className="space-y-4"
			>
				<div>
					<h2 className="text-base font-semibold text-zinc-900">Assign location</h2>
					<p className="text-sm text-zinc-500 mt-0.5">
						The employee will only be able to access inventory at this location.
					</p>
				</div>

				{allLocations.length === 0 ? (
					<div className="text-center py-8 text-sm text-zinc-400">No locations found.</div>
				) : (
					<div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
						{allLocations.map((location: Location) => (
							<LocationRow
								key={location.id}
								location={location}
								isSelected={selectedLocationId === location.id}
								mode="radio"
								onClick={() => setValue('assigned_location_id', location.id)}
							/>
						))}
					</div>
				)}

				{!selectedLocationId && (
					<p className="text-xs text-red-500">Please select a location to continue.</p>
				)}
			</form>
		);
	}

	// ── Admin: multi-location (optional) ─────────────────────────────────────
	return (
		<form
			id="location-step-form"
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-4"
		>
			<div>
				<h2 className="text-base font-semibold text-zinc-900">Assign locations</h2>
				<p className="text-sm text-zinc-500 mt-0.5">
					Select which locations this admin can manage. Leave empty to grant access to all locations.
				</p>
			</div>

			{allLocations.length === 0 ? (
				<div className="text-center py-8 text-sm text-zinc-400">No locations found.</div>
			) : (
				<>
					<div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
						{allLocations.map((location: Location) => (
							<LocationRow
								key={location.id}
								location={location}
								isSelected={selectedLocationIds.includes(location.id)}
								mode="checkbox"
								onClick={() => toggleLocation(location.id)}
							/>
						))}
					</div>

					<div className="flex items-center justify-between">
						<p className={cn(
							"text-xs",
							selectedLocationIds.length > 0
								? "text-indigo-600 font-medium"
								: "text-zinc-400"
						)}>
							{selectedLocationIds.length === 0
								? 'No locations selected — access to all locations'
								: `${selectedLocationIds.length} location${selectedLocationIds.length !== 1 ? 's' : ''} selected`}
						</p>
						{selectedLocationIds.length > 0 && (
							<button
								type="button"
								onClick={() => setValue('assigned_location_ids', [])}
								className="text-xs text-zinc-400 hover:text-zinc-600"
							>
								Clear all
							</button>
						)}
					</div>
				</>
			)}
		</form>
	);
}