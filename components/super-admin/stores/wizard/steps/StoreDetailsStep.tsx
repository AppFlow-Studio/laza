"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocations } from "@/lib/hooks/queries/useLocations";
import { Copy, MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES: ("places")[] = ["places"];
const MAP_CONTAINER_STYLE = { width: "100%", height: "300px" };
const DEFAULT_CENTER = { lat: 40.73, lng: -73.93 };

const storeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.object({
        street: z.string().min(1, "Street is required"),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State is required"),
        zip: z.string().min(1, "ZIP is required"),
        country: z.string().optional(),
    }),
    is_active: z.boolean(),
    clone_from_id: z.string().nullable(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
});

export type StoreFormData = z.infer<typeof storeSchema>;

interface StoreDetailsStepProps {
    defaultValues?: StoreFormData | null;
    onSubmit: (data: StoreFormData) => void;
}

export default function StoreDetailsStep({
    defaultValues,
    onSubmit,
}: StoreDetailsStepProps) {
    const { data: existingLocations = [] } = useLocations();
    const storeLocations = existingLocations.filter(
        (l: any) => !l.location_type || l.location_type === "store",
    );

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<StoreFormData>({
        resolver: zodResolver(storeSchema),
        defaultValues: defaultValues || {
            name: "",
            address: {
                street: "",
                city: "",
                state: "",
                zip: "",
                country: "US",
            },
            is_active: true,
            clone_from_id: null,
            latitude: null,
            longitude: null,
        },
    });

    const cloneFromId = watch("clone_from_id");
    const latitude = watch("latitude");
    const longitude = watch("longitude");

    const [geocoding, setGeocoding] = useState(false);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
        defaultValues?.latitude != null && defaultValues?.longitude != null
            ? { lat: defaultValues.latitude, lng: defaultValues.longitude }
            : DEFAULT_CENTER
    );

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
        libraries: LIBRARIES,
    });

    const markerPosition =
        latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;

    const handleMapClick = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                setValue("latitude", e.latLng.lat());
                setValue("longitude", e.latLng.lng());
            }
        },
        [setValue]
    );

    const handleMarkerDragEnd = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                setValue("latitude", e.latLng.lat());
                setValue("longitude", e.latLng.lng());
            }
        },
        [setValue]
    );

    const handleGeocode = async () => {
        const { address } = getValues();
        const parts = [address.street, address.city, address.state, address.zip].filter(Boolean);
        if (parts.length === 0) return;

        setGeocoding(true);
        try {
            const encoded = encodeURIComponent(parts.join(", "));
            const res = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const data = await res.json();
            if (data.status === "OK" && data.results[0]) {
                const { lat, lng } = data.results[0].geometry.location;
                setValue("latitude", lat);
                setValue("longitude", lng);
                setMapCenter({ lat, lng });
            }
        } catch {
            // silently fail
        } finally {
            setGeocoding(false);
        }
    };

    const clearCoords = () => {
        setValue("latitude", null);
        setValue("longitude", null);
    };

    const handleAddressBlur = useCallback(() => {
        const { address } = getValues();
        if (address.street && address.city && !geocoding && isLoaded) {
            handleGeocode();
        }
    }, [getValues, geocoding, isLoaded]);

    const inputClass = (hasError?: boolean) =>
        cn(
            "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
            hasError
                ? "border-rose-400 focus:ring-rose-500"
                : "border-gray-200 focus:ring-indigo-500",
        );

    return (
        <form
            id="store-details-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
        >
            {/* Store Name */}
            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Store Name <span className="text-rose-500">*</span>
                </label>
                <input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Brooklyn Location"
                    className={inputClass(!!errors.name)}
                />
                {errors.name && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.name.message}
                    </p>
                )}
            </div>

            {/* Street */}
            <div>
                <label
                    htmlFor="street"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Street Address <span className="text-rose-500">*</span>
                </label>
                <input
                    id="street"
                    {...register("address.street")}
                    placeholder="123 Main St"
                    className={inputClass(!!errors.address?.street)}
                    onBlur={handleAddressBlur}
                />
                {errors.address?.street && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.address.street.message}
                    </p>
                )}
            </div>

            {/* City + State */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label
                        htmlFor="city"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        City <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="city"
                        {...register("address.city")}
                        className={inputClass(!!errors.address?.city)}
                        onBlur={handleAddressBlur}
                    />
                    {errors.address?.city && (
                        <p className="text-xs text-rose-500 font-medium mt-1">
                            {errors.address.city.message}
                        </p>
                    )}
                </div>
                <div>
                    <label
                        htmlFor="state"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                        State <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="state"
                        {...register("address.state")}
                        className={inputClass(!!errors.address?.state)}
                        onBlur={handleAddressBlur}
                    />
                    {errors.address?.state && (
                        <p className="text-xs text-rose-500 font-medium mt-1">
                            {errors.address.state.message}
                        </p>
                    )}
                </div>
            </div>

            {/* ZIP */}
            <div>
                <label
                    htmlFor="zip"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    ZIP Code <span className="text-rose-500">*</span>
                </label>
                <input
                    id="zip"
                    {...register("address.zip")}
                    className={inputClass(!!errors.address?.zip)}
                    onBlur={handleAddressBlur}
                />
                {errors.address?.zip && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.address.zip.message}
                    </p>
                )}
            </div>

            {/* Map Location Picker */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                        Map Pin
                    </label>
                    <button
                        type="button"
                        onClick={handleGeocode}
                        disabled={geocoding || !isLoaded}
                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {geocoding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <MapPin className="w-3 h-3" />
                        )}
                        Use address
                    </button>
                </div>
                <p className="text-xs text-zinc-500 mb-2">
                    Click the map to drop a pin, or drag to adjust. Used for the stores map view.
                </p>

                {isLoaded ? (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                        <GoogleMap
                            mapContainerStyle={MAP_CONTAINER_STYLE}
                            center={mapCenter}
                            zoom={markerPosition ? 15 : 11}
                            onClick={handleMapClick}
                            options={{
                                streetViewControl: false,
                                mapTypeControl: false,
                                fullscreenControl: false,
                                clickableIcons: false,
                                styles: [
                                    {
                                        featureType: "poi",
                                        elementType: "labels",
                                        stylers: [{ visibility: "off" }],
                                    },
                                ],
                            }}
                        >
                            {markerPosition && (
                                <Marker
                                    position={markerPosition}
                                    draggable
                                    onDragEnd={handleMarkerDragEnd}
                                />
                            )}
                        </GoogleMap>
                    </div>
                ) : (
                    <div
                        className="rounded-xl bg-zinc-100 animate-pulse border border-gray-200"
                        style={{ height: 300 }}
                    />
                )}

                {markerPosition ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500">
                        <MapPin className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <span>
                            {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
                        </span>
                        <button
                            type="button"
                            onClick={clearCoords}
                            className="ml-1 text-zinc-400 hover:text-rose-500 transition-colors"
                            title="Clear pin"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <p className="text-xs text-zinc-400 mt-1.5">No pin set — store won't appear on map.</p>
                )}
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="is_active"
                    {...register("is_active")}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                    htmlFor="is_active"
                    className="text-sm font-medium text-gray-700"
                >
                    Active
                </label>
            </div>

            {/* Clone from existing store */}
            {storeLocations.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Copy className="w-4 h-4 text-indigo-500 shrink-0" />
                        Clone layout from existing store{" "}
                        <span className="text-gray-400 font-normal">
                            (optional)
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">
                        Copies storage spaces and item assignments from the
                        selected store to save setup time.
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                        <button
                            type="button"
                            onClick={() => setValue("clone_from_id", null)}
                            className={cn(
                                "px-3 py-2.5 rounded-xl border text-sm text-left transition-all",
                                cloneFromId === null
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                            )}
                        >
                            Start fresh
                        </button>
                        {storeLocations.map((loc: any) => {
                            const addr =
                                typeof loc.address === "string"
                                    ? JSON.parse(loc.address)
                                    : loc.address;
                            return (
                                <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() =>
                                        setValue("clone_from_id", loc.id)
                                    }
                                    className={cn(
                                        "px-3 py-2.5 rounded-xl border text-sm text-left transition-all",
                                        cloneFromId === loc.id
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                                    )}
                                >
                                    <span className="font-medium">
                                        {loc.name}
                                    </span>
                                    {addr && (
                                        <span className="text-gray-400 ml-2 font-normal">
                                            {addr.city}, {addr.state}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </form>
    );
}
