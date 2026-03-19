"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLocations } from "@/lib/hooks/queries/useLocations";
import { useAlerts } from "@/lib/hooks/queries/useInventory";
import { useOrganizationUsers } from "@/lib/hooks/queries/useUsers";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
// import { usePendingTicketCount } from "@/lib/hooks/queries/useOrderTickets";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import SearchBar from "@/components/admin/shared/SearchBar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	MapPin,
	Users,
	AlertTriangle,
	ChevronRight,
	Store,
	LayoutGrid,
	Map as MapIcon,
	X,
	ClipboardList,
	Plus,
} from "lucide-react";
import {
	GoogleMap,
	useJsApiLoader,
	MarkerClusterer,
	Marker,
	InfoWindow,
} from "@react-google-maps/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedAddress {
	street?: string;
	city?: string;
	state?: string;
	zip?: string;
}

interface StoreWithCoords {
	id: string;
	name: string;
	address: ParsedAddress;
	location_type: string;
	lat: number | null;
	lng: number | null;
}

// ─── Geocoding cache (module-level, survives re-renders) ──────────────────────
// NOTE FOR TEAM: Once `latitude` and `longitude` columns are added to the
// `locations` table (recommended in Task 2.12 notes), replace this geocoding
// logic with direct column reads to eliminate the Google Geocoding API calls.

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeAddress(address: ParsedAddress): Promise<{ lat: number; lng: number } | null> {
	const key = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
	if (geocodeCache.has(key)) return geocodeCache.get(key)!;

	try {
		const encoded = encodeURIComponent(key);
		const res = await fetch(
			`https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
		);
		const data = await res.json();
		if (data.status === "OK" && data.results[0]) {
			const { lat, lng } = data.results[0].geometry.location;
			const result = { lat, lng };
			geocodeCache.set(key, result);
			return result;
		}
	} catch {
		// silently fail — store will be omitted from map
	}
	geocodeCache.set(key, null);
	return null;
}

// ─── Map constants ─────────────────────────────────────────────────────────

const MAP_CONTAINER_STYLE = { width: "100%", height: "560px" };
const DEFAULT_CENTER = { lat: 40.73, lng: -73.93 }; // NYC default — adjust per client
const DEFAULT_ZOOM = 11;
const LIBRARIES: ("places")[] = ["places"];

// ─── Store Card (grid view) ───────────────────────────────────────────────────

function StoreCard({
					   location,
					   employeeCount,
					   alertCount,
				   }: {
	location: any;
	employeeCount: number;
	alertCount: number;
}) {
	const address =
		typeof location.address === "string"
			? JSON.parse(location.address)
			: location.address;

	return (
		<Link
			href={`/super-admin/stores/${location.id}`}
			className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 hover:shadow-md hover:border-zinc-300 transition-all group flex flex-col"
		>
			<div className="flex items-start justify-between mb-4">
				<div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors flex-shrink-0">
					<Store className="w-5 h-5 text-indigo-600" />
				</div>
				<ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-colors mt-1" />
			</div>

			<h3 className="font-semibold text-zinc-900 mb-1 leading-tight">
				{location.name}
			</h3>

			{address && (
				<p className="text-sm text-zinc-500 mb-4 flex items-start gap-1.5 leading-snug">
					<MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-zinc-400" />
					<span>
						{address.street}, {address.city}, {address.state} {address.zip}
					</span>
				</p>
			)}

			<div className="flex items-center gap-3 mt-auto pt-3 border-t border-zinc-100">
				<div className="flex items-center gap-1.5 text-sm text-zinc-600">
					<Users className="w-4 h-4 text-zinc-400" />
					<span>
						{employeeCount} {employeeCount === 1 ? "employee" : "employees"}
					</span>
				</div>
				{alertCount > 0 ? (
					<div className="flex items-center gap-1.5 text-sm text-red-600 font-medium ml-auto">
						<AlertTriangle className="w-4 h-4" />
						<span>{alertCount} {alertCount === 1 ? "alert" : "alerts"}</span>
					</div>
				) : (
					<div className="flex items-center gap-1.5 text-sm text-emerald-600 ml-auto">
						<span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
						<span>All good</span>
					</div>
				)}
			</div>
		</Link>
	);
}

function StoreCardSkeleton() {
	return (
		<div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 animate-pulse">
			<div className="flex items-start justify-between mb-4">
				<div className="w-10 h-10 rounded-lg bg-zinc-100" />
			</div>
			<div className="h-4 w-2/3 bg-zinc-100 rounded mb-2" />
			<div className="h-3 w-full bg-zinc-100 rounded mb-1" />
			<div className="h-3 w-1/2 bg-zinc-100 rounded mb-4" />
			<div className="flex gap-3 pt-3 border-t border-zinc-100">
				<div className="h-3 w-20 bg-zinc-100 rounded" />
				<div className="h-3 w-16 bg-zinc-100 rounded ml-auto" />
			</div>
		</div>
	);
}

// ─── Map view ────────────────────────────────────────────────────────────────

function StoresMap({
					   stores,
					   alertsByLocation,
					   pendingByLocation,
				   }: {
	stores: StoreWithCoords[];
	alertsByLocation: Record<string, number>;
	pendingByLocation: Record<string, number>;
}) {
	const router = useRouter();
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
		libraries: LIBRARIES,
	});

	const mappableStores = stores.filter((s) => s.lat !== null && s.lng !== null);
	const selectedStore = mappableStores.find((s) => s.id === selectedId) ?? null;

	// Auto-fit bounds once stores are ready
	const mapRef = useRef<google.maps.Map | null>(null);
	const onMapLoad = useCallback((map: google.maps.Map) => {
		mapRef.current = map;
		if (mappableStores.length > 1) {
			const bounds = new window.google.maps.LatLngBounds();
			mappableStores.forEach((s) => bounds.extend({ lat: s.lat!, lng: s.lng! }));
			map.fitBounds(bounds, 60);
		}
	}, [mappableStores]);

	if (loadError) {
		return (
			<div className="bg-white rounded-xl border border-zinc-200 flex items-center justify-center h-[560px]">
				<div className="text-center">
					<MapPin className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
					<p className="text-zinc-500 font-medium">Map failed to load</p>
					<p className="text-zinc-400 text-sm mt-1">Check your Google Maps API key</p>
				</div>
			</div>
		);
	}

	if (!isLoaded) {
		return (
			<div className="bg-zinc-100 rounded-xl animate-pulse" style={{ height: 560 }} />
		);
	}

	if (mappableStores.length === 0) {
		return (
			<div className="bg-white rounded-xl border border-zinc-200 flex items-center justify-center h-[560px]">
				<div className="text-center">
					<MapPin className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
					<p className="text-zinc-500 font-medium">No locations to display</p>
					<p className="text-zinc-400 text-sm mt-1">
						Addresses couldn't be geocoded. Add latitude/longitude columns to skip geocoding.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
			<GoogleMap
				mapContainerStyle={MAP_CONTAINER_STYLE}
				center={DEFAULT_CENTER}
				zoom={DEFAULT_ZOOM}
				onLoad={onMapLoad}
				options={{
					streetViewControl: false,
					mapTypeControl: false,
					fullscreenControl: false,
					styles: [
						{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
					],
				}}
			>
				<MarkerClusterer
					options={{
						imagePath: "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
						maxZoom: 14,
					}}
				>
					{(clusterer) => (
						<>
							{mappableStores.map((store) => {
								const alertCount = alertsByLocation[store.id] ?? 0;
								return (
									<Marker
										key={store.id}
										position={{ lat: store.lat!, lng: store.lng! }}
										clusterer={clusterer}
										onClick={() => setSelectedId(store.id)}
										icon={{
											path: window.google.maps.SymbolPath.CIRCLE,
											scale: 10,
											fillColor: alertCount > 0 ? "#ef4444" : "#4f46e5",
											fillOpacity: 1,
											strokeColor: "#ffffff",
											strokeWeight: 2,
										}}
										title={store.name}
									/>
								);
							})}
						</>
					)}
				</MarkerClusterer>

				{selectedStore && (
					<InfoWindow
						position={{ lat: selectedStore.lat!, lng: selectedStore.lng! }}
						onCloseClick={() => setSelectedId(null)}
						options={{ pixelOffset: new window.google.maps.Size(0, -14) }}
					>
						<div className="min-w-[180px] max-w-[220px] p-1">
							<p className="font-semibold text-zinc-900 text-sm mb-1">
								{selectedStore.name}
							</p>
							<p className="text-xs text-zinc-500 mb-2 leading-snug">
								{selectedStore.address.street},{" "}
								{selectedStore.address.city}
							</p>
							<div className="flex items-center gap-2 text-xs mb-3">
								{(alertsByLocation[selectedStore.id] ?? 0) > 0 && (
									<span className="flex items-center gap-1 text-red-600 font-medium">
										<AlertTriangle className="w-3 h-3" />
										{alertsByLocation[selectedStore.id]} alert
										{alertsByLocation[selectedStore.id] !== 1 ? "s" : ""}
									</span>
								)}
								{(pendingByLocation[selectedStore.id] ?? 0) > 0 && (
									<span className="flex items-center gap-1 text-yellow-600 font-medium">
										<ClipboardList className="w-3 h-3" />
										{pendingByLocation[selectedStore.id]} pending
									</span>
								)}
								{(alertsByLocation[selectedStore.id] ?? 0) === 0 &&
									(pendingByLocation[selectedStore.id] ?? 0) === 0 && (
										<span className="text-emerald-600">All good</span>
									)}
							</div>
							<button
								onClick={() => router.push(`/super-admin/stores/${selectedStore.id}`)}
								className="w-full text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded px-3 py-1.5 transition-colors"
							>
								View store →
							</button>
						</div>
					</InfoWindow>
				)}
			</GoogleMap>
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "map";

export default function AllStoresPage() {
	const { data: userInfo } = useUserInfo();
	const orgId = userInfo?.members?.organization_id;

	const { data: locations, isLoading: locationsLoading } = useLocations();
	const { data: employees } = useOrganizationUsers(orgId);
	const { data: alerts } = useAlerts({ resolved: false });
	// const { data: pendingCount } = usePendingTicketCount(orgId);

	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");

	// Stores only
	const stores = useMemo(
		() => (locations ?? []).filter((l: any) => l.location_type !== "warehouse"),
		[locations]
	);

	const filteredStores = useMemo(() => {
		if (!searchQuery.trim()) return stores;
		const q = searchQuery.toLowerCase();
		return stores.filter((l: any) => {
			const address =
				typeof l.address === "string" ? JSON.parse(l.address) : l.address;
			return (
				l.name?.toLowerCase().includes(q) ||
				address?.city?.toLowerCase().includes(q) ||
				address?.street?.toLowerCase().includes(q)
			);
		});
	}, [stores, searchQuery]);

	// Employee counts per location
	const employeesByLocation = useMemo(() => {
		const map: Record<string, number> = {};
		(employees ?? []).forEach((emp: any) => {
			const locId = emp.assigned_location_id;
			if (locId) map[locId] = (map[locId] ?? 0) + 1;
		});
		return map;
	}, [employees]);

	// Alert counts per location
	const alertsByLocation = useMemo(() => {
		const map: Record<string, number> = {};
		(alerts ?? []).forEach((alert: any) => {
			const locId = alert.location_id;
			if (locId) map[locId] = (map[locId] ?? 0) + 1;
		});
		return map;
	}, [alerts]);

	// Pending ticket counts per location — placeholder until useAllTickets exists
	const pendingByLocation: Record<string, number> = {};

	const totalAlerts = Object.values(alertsByLocation).reduce((a, b) => a + b, 0);

	// ── Geocoded stores for map view ──
	const [storesWithCoords, setStoresWithCoords] = useState<StoreWithCoords[]>([]);
	const [geocoding, setGeocoding] = useState(false);

	useEffect(() => {
		if (viewMode !== "map" || stores.length === 0) return;

		let cancelled = false;
		setGeocoding(true);

		Promise.all(
			stores.map(async (loc: any): Promise<StoreWithCoords> => {
				const address =
					typeof loc.address === "string"
						? JSON.parse(loc.address)
						: loc.address;

				if (loc.latitude != null && loc.longitude != null) {
					return { ...loc, address, lat: loc.latitude, lng: loc.longitude };
				}

				const coords = await geocodeAddress(address);
				return {
					id: loc.id,
					name: loc.name,
					address,
					location_type: loc.location_type,
					lat: coords?.lat ?? null,
					lng: coords?.lng ?? null,
				};
			})
		).then((results) => {
			if (!cancelled) {
				setStoresWithCoords(results);
				setGeocoding(false);
			}
		});

		return () => { cancelled = true; };
	}, [viewMode, stores]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900">All Stores</h1>
					<p className="text-sm text-zinc-500 mt-0.5">
						{locationsLoading
							? "Loading…"
							: `${stores.length} ${stores.length === 1 ? "store" : "stores"}`}
						{totalAlerts > 0 && (
							<span className="ml-2 text-red-600 font-medium">
								· {totalAlerts} active{" "}
								{totalAlerts === 1 ? "alert" : "alerts"}
							</span>
						)}
					</p>
				</div>

				<div className="flex items-center gap-3 flex-wrap">
					{/* View toggle */}
					<div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
						<button
							onClick={() => setViewMode("grid")}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								viewMode === "grid"
									? "bg-white text-zinc-900 shadow-sm"
									: "text-zinc-500 hover:text-zinc-700"
							}`}
						>
							<LayoutGrid className="w-3.5 h-3.5" />
							Grid
						</button>
						<button
							onClick={() => setViewMode("map")}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
								viewMode === "map"
									? "bg-white text-zinc-900 shadow-sm"
									: "text-zinc-500 hover:text-zinc-700"
							}`}
						>
							<MapIcon className="w-3.5 h-3.5" />
							Map
						</button>
					</div>

					<div className="w-full sm:w-64">
						<SearchBar
							placeholder="Search by name or city…"
							onSearch={setSearchQuery}
						/>
					</div>

					{/* ── Add new store button ── */}
					<Link
						href="/super-admin/stores/new"
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
					>
						<Plus className="w-4 h-4" />
						New Store
					</Link>
				</div>
			</div>

			{/* Grid view */}
			{viewMode === "grid" && (
				<>
					{locationsLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<StoreCardSkeleton key={i} />
							))}
						</div>
					) : filteredStores.length === 0 ? (
						<div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
							<Store className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
							{searchQuery ? (
								<>
									<p className="text-zinc-500 font-medium">
										No stores match "{searchQuery}"
									</p>
									<button
										onClick={() => setSearchQuery("")}
										className="text-sm text-indigo-600 hover:underline mt-1"
									>
										Clear search
									</button>
								</>
							) : (
								<>
									<p className="text-zinc-500 font-medium">No store locations yet</p>
									<p className="text-zinc-400 text-sm mt-1 mb-4">
										Get started by opening your first store.
									</p>
									<Link
										href="/super-admin/stores/new"
										className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
									>
										<Plus className="w-4 h-4" />
										New Store
									</Link>
								</>
							)}
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{filteredStores.map((location: any) => (
								<StoreCard
									key={location.id}
									location={location}
									employeeCount={employeesByLocation[location.id] ?? 0}
									alertCount={alertsByLocation[location.id] ?? 0}
								/>
							))}
						</div>
					)}
				</>
			)}

			{/* Map view */}
			{viewMode === "map" && (
				<>
					{geocoding ? (
						<div
							className="bg-zinc-100 rounded-xl animate-pulse"
							style={{ height: 560 }}
						/>
					) : (
						<StoresMap
							stores={storesWithCoords}
							alertsByLocation={alertsByLocation}
							pendingByLocation={pendingByLocation}
						/>
					)}

					{/* Legend */}
					<div className="flex items-center gap-4 text-xs text-zinc-500">
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
							No alerts
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
							Has alerts
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-4 h-4 rounded-full bg-zinc-400 text-white text-[9px] flex items-center justify-center font-bold inline-flex">
								3
							</span>
							Clustered pins
						</div>
					</div>
				</>
			)}
		</div>
	);
}