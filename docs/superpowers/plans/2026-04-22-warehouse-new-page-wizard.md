# Warehouse Creation Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2-step wizard at `/super-admin/warehouse/new` that creates a new warehouse location with name, address, map pin, and active status.

**Architecture:** Thin page shell renders `WarehouseSetupWizard`, which orchestrates 2 animated steps (Details → Review) using the same layout pattern as `StoreSetupWizard`. `createLocation` gains an optional `location_type` field so the wizard can stamp the new row as `'warehouse'`.

**Tech Stack:** Next.js App Router, React Hook Form + Zod, Framer Motion, TanStack React Query, `@react-google-maps/api`, shadcn/ui, Tailwind CSS

---

## File Map

| Action | Path |
|--------|------|
| Modify | `lib/supabase/queries/locations.ts` |
| Create | `components/super-admin/warehouse/wizard/steps/WarehouseDetailsStep.tsx` |
| Create | `components/super-admin/warehouse/wizard/steps/WarehouseConfirmationStep.tsx` |
| Create | `components/super-admin/warehouse/wizard/WarehouseWizardSidebar.tsx` |
| Create | `components/super-admin/warehouse/wizard/WarehouseSetupWizard.tsx` |
| Create | `app/(dashboard)/super-admin/warehouse/new/page.tsx` |

---

### Task 1: Add `location_type` to `createLocation`

**Files:**
- Modify: `lib/supabase/queries/locations.ts`

- [ ] **Step 1: Update the function signature**

In `lib/supabase/queries/locations.ts`, change the `createLocation` parameter type to include `location_type`:

```ts
export async function createLocation(location: {
    organization_id: string;
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
    };
    is_active?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    location_type?: string;
}) {
```

The rest of the function body is unchanged — the `location` object is passed directly to `supabase.from('locations').insert([location])`, so Supabase will include `location_type` automatically when provided.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no type errors related to `createLocation`.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/queries/locations.ts
git commit -m "feat: add optional location_type to createLocation"
```

---

### Task 2: WarehouseDetailsStep

**Files:**
- Create: `components/super-admin/warehouse/wizard/steps/WarehouseDetailsStep.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES: ("places")[] = ["places"];
const MAP_CONTAINER_STYLE = { width: "100%", height: "300px" };
const DEFAULT_CENTER = { lat: 40.73, lng: -73.93 };

const warehouseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.object({
        street:  z.string().min(1, "Street is required"),
        city:    z.string().min(1, "City is required"),
        state:   z.string().min(1, "State is required"),
        zip:     z.string().min(1, "ZIP is required"),
        country: z.string().optional(),
    }),
    is_active:  z.boolean(),
    latitude:   z.number().nullable().optional(),
    longitude:  z.number().nullable().optional(),
});

export type WarehouseFormData = z.infer<typeof warehouseSchema>;

interface Props {
    defaultValues?: WarehouseFormData | null;
    onSubmit: (data: WarehouseFormData) => void;
}

export default function WarehouseDetailsStep({ defaultValues, onSubmit }: Props) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<WarehouseFormData>({
        resolver: zodResolver(warehouseSchema),
        defaultValues: defaultValues || {
            name: "",
            address: { street: "", city: "", state: "", zip: "", country: "US" },
            is_active: true,
            latitude:  null,
            longitude: null,
        },
    });

    const latitude  = watch("latitude");
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
                setValue("latitude",  e.latLng.lat());
                setValue("longitude", e.latLng.lng());
            }
        },
        [setValue]
    );

    const handleMarkerDragEnd = useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                setValue("latitude",  e.latLng.lat());
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
            const res  = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const data = await res.json();
            if (data.status === "OK" && data.results[0]) {
                const { lat, lng } = data.results[0].geometry.location;
                setValue("latitude",  lat);
                setValue("longitude", lng);
                setMapCenter({ lat, lng });
            }
        } catch {
            // silently ignore geocode failures
        } finally {
            setGeocoding(false);
        }
    };

    const clearCoords = () => {
        setValue("latitude",  null);
        setValue("longitude", null);
    };

    const inputClass = (hasError?: boolean) =>
        cn(
            "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
            hasError
                ? "border-rose-400 focus:ring-rose-500"
                : "border-gray-200 focus:ring-indigo-500"
        );

    return (
        <form id="warehouse-details-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Warehouse Name <span className="text-rose-500">*</span>
                </label>
                <input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Main Warehouse"
                    className={inputClass(!!errors.name)}
                />
                {errors.name && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.name.message}</p>
                )}
            </div>

            {/* Street */}
            <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Street Address <span className="text-rose-500">*</span>
                </label>
                <input
                    id="street"
                    {...register("address.street")}
                    placeholder="123 Industrial Ave"
                    className={inputClass(!!errors.address?.street)}
                />
                {errors.address?.street && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.address.street.message}</p>
                )}
            </div>

            {/* City + State */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                        City <span className="text-rose-500">*</span>
                    </label>
                    <input id="city" {...register("address.city")} className={inputClass(!!errors.address?.city)} />
                    {errors.address?.city && (
                        <p className="text-xs text-rose-500 font-medium mt-1">{errors.address.city.message}</p>
                    )}
                </div>
                <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1.5">
                        State <span className="text-rose-500">*</span>
                    </label>
                    <input id="state" {...register("address.state")} className={inputClass(!!errors.address?.state)} />
                    {errors.address?.state && (
                        <p className="text-xs text-rose-500 font-medium mt-1">{errors.address.state.message}</p>
                    )}
                </div>
            </div>

            {/* ZIP */}
            <div>
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1.5">
                    ZIP Code <span className="text-rose-500">*</span>
                </label>
                <input id="zip" {...register("address.zip")} className={inputClass(!!errors.address?.zip)} />
                {errors.address?.zip && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.address.zip.message}</p>
                )}
            </div>

            {/* Map pin */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Map Pin</label>
                    <button
                        type="button"
                        onClick={handleGeocode}
                        disabled={geocoding || !isLoaded}
                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                        Use address
                    </button>
                </div>
                <p className="text-xs text-zinc-500 mb-2">Optional — click to drop a pin, or drag to adjust.</p>

                {isLoaded ? (
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                        <GoogleMap
                            mapContainerStyle={MAP_CONTAINER_STYLE}
                            center={mapCenter}
                            zoom={markerPosition ? 15 : 11}
                            onClick={handleMapClick}
                            options={{
                                streetViewControl: false,
                                mapTypeControl:    false,
                                fullscreenControl: false,
                                clickableIcons:    false,
                                styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
                            }}
                        >
                            {markerPosition && (
                                <Marker position={markerPosition} draggable onDragEnd={handleMarkerDragEnd} />
                            )}
                        </GoogleMap>
                    </div>
                ) : (
                    <div className="rounded-xl bg-zinc-100 animate-pulse border border-gray-200" style={{ height: 300 }} />
                )}

                {markerPosition ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500">
                        <MapPin className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <span>{markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}</span>
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
                    <p className="text-xs text-zinc-400 mt-1.5">No pin set.</p>
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
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
            </div>
        </form>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors in `WarehouseDetailsStep.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/super-admin/warehouse/wizard/steps/WarehouseDetailsStep.tsx
git commit -m "feat: add WarehouseDetailsStep form"
```

---

### Task 3: WarehouseConfirmationStep

**Files:**
- Create: `components/super-admin/warehouse/wizard/steps/WarehouseConfirmationStep.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { CheckCircle2, MapPin, Pencil, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WarehouseFormData } from "./WarehouseDetailsStep";

interface Props {
    warehouseData:     WarehouseFormData;
    createdLocationId: string | null;
    onEditStep:        (step: number) => void;
}

export default function WarehouseConfirmationStep({ warehouseData, createdLocationId, onEditStep }: Props) {
    if (createdLocationId) {
        return (
            <div className="text-center py-8 space-y-6">
                <div className="flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9 text-green-600" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-zinc-900">Warehouse is ready!</h3>
                    <p className="text-sm text-zinc-500 mt-2">
                        <strong>{warehouseData.name}</strong> has been created and is{" "}
                        {warehouseData.is_active ? "active" : "inactive"}.
                    </p>
                </div>
                <a
                    href={`/super-admin/warehouse/${createdLocationId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    View Warehouse
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        );
    }

    const { address } = warehouseData;

    return (
        <div className="space-y-5">
            <SectionCard title="Warehouse Details" onEdit={() => onEditStep(1)}>
                <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium text-zinc-900">{warehouseData.name}</p>
                        <p className="text-sm text-zinc-500">
                            {address.street}, {address.city}, {address.state} {address.zip}
                        </p>
                        <span className={cn(
                            "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            warehouseData.is_active ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-600"
                        )}>
                            {warehouseData.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                </div>
            </SectionCard>

            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h4 className="text-sm font-medium text-indigo-900 mb-1">Ready to create</h4>
                <p className="text-sm text-indigo-700">
                    Creating <strong>{warehouseData.name}</strong> as a new warehouse location.
                </p>
            </div>
        </div>
    );
}

function SectionCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
    return (
        <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
                <button
                    onClick={onEdit}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
            </div>
            {children}
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/super-admin/warehouse/wizard/steps/WarehouseConfirmationStep.tsx
git commit -m "feat: add WarehouseConfirmationStep"
```

---

### Task 4: WarehouseWizardSidebar

**Files:**
- Create: `components/super-admin/warehouse/wizard/WarehouseWizardSidebar.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
    { number: 1, title: "Warehouse Details", description: "Name, address, status" },
    { number: 2, title: "Review & Create",   description: "Confirm and finish" },
];

interface Props {
    currentStep:    number;
    completedSteps: Set<number>;
    onStepClick:    (step: number) => void;
}

export default function WarehouseWizardSidebar({ currentStep, completedSteps, onStepClick }: Props) {
    const canNavigateTo = (step: number) => completedSteps.has(step) || step === currentStep;

    return (
        <nav className="space-y-1">
            {STEPS.map((step, index) => {
                const isCompleted = completedSteps.has(step.number);
                const isCurrent   = currentStep === step.number;
                const isClickable = canNavigateTo(step.number);
                const isLast      = index === STEPS.length - 1;

                return (
                    <div key={step.number} className="relative">
                        <button
                            onClick={() => isClickable && onStepClick(step.number)}
                            disabled={!isClickable}
                            className={cn(
                                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                                isCurrent && "bg-indigo-50",
                                isClickable && !isCurrent && "hover:bg-zinc-50",
                                !isClickable && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className={cn(
                                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                                isCompleted && "bg-indigo-600 border-indigo-600 text-white",
                                isCurrent && !isCompleted && "border-indigo-600 text-indigo-600",
                                !isCurrent && !isCompleted && "border-zinc-300 text-zinc-400"
                            )}>
                                {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                            </div>
                            <div className="min-w-0">
                                <p className={cn(
                                    "text-sm font-medium",
                                    isCurrent ? "text-indigo-600" : isCompleted ? "text-zinc-900" : "text-zinc-500"
                                )}>
                                    {step.title}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">{step.description}</p>
                            </div>
                        </button>

                        {!isLast && (
                            <div className="absolute left-[1.3rem] top-[2.75rem] w-0.5 h-3">
                                <div className={cn("w-full h-full rounded-full", isCompleted ? "bg-indigo-600" : "bg-zinc-200")} />
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/super-admin/warehouse/wizard/WarehouseWizardSidebar.tsx
git commit -m "feat: add WarehouseWizardSidebar"
```

---

### Task 5: WarehouseSetupWizard

**Files:**
- Create: `components/super-admin/warehouse/wizard/WarehouseSetupWizard.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { useCreateLocation } from "@/lib/hooks/queries/useLocations";
import WarehouseWizardSidebar from "./WarehouseWizardSidebar";
import WarehouseDetailsStep from "./steps/WarehouseDetailsStep";
import type { WarehouseFormData } from "./steps/WarehouseDetailsStep";
import WarehouseConfirmationStep from "./steps/WarehouseConfirmationStep";

const TOTAL_STEPS = 2;

export default function WarehouseSetupWizard() {
    const router      = useRouter();
    const queryClient = useQueryClient();

    const { data: userInfo }     = useUserInfo();
    const organizationId         = userInfo?.members?.organization_id;
    const createLocationMutation = useCreateLocation();

    const [currentStep,    setCurrentStep]    = useState(1);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [direction,      setDirection]      = useState(1);
    const [warehouseData,  setWarehouseData]  = useState<WarehouseFormData | null>(null);
    const [isSubmitting,   setIsSubmitting]   = useState(false);
    const [createdLocationId, setCreatedLocationId] = useState<string | null>(null);

    const markCompleted = useCallback((step: number) => {
        setCompletedSteps(prev => new Set([...prev, step]));
    }, []);

    const goToStep = useCallback((step: number) => {
        setDirection(step > currentStep ? 1 : -1);
        setCurrentStep(step);
    }, [currentStep]);

    // Step 1 form submit
    const handleDetailsSubmit = (data: WarehouseFormData) => {
        setWarehouseData(data);
        markCompleted(1);
        goToStep(2);
    };

    // Footer Next / Back
    const handleNext = () => {
        if (currentStep === 1) {
            const form = document.getElementById("warehouse-details-form") as HTMLFormElement;
            form?.requestSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) goToStep(currentStep - 1);
    };

    // Final create
    const handleSubmit = async () => {
        if (!warehouseData || !organizationId) return;
        setIsSubmitting(true);
        try {
            const location = await createLocationMutation.mutateAsync({
                organization_id: organizationId,
                name:            warehouseData.name,
                address:         warehouseData.address,
                is_active:       warehouseData.is_active,
                latitude:        warehouseData.latitude ?? null,
                longitude:       warehouseData.longitude ?? null,
                location_type:   "warehouse",
            });
            // Invalidate warehouse-specific queries in addition to the 'locations' key
            // that useCreateLocation already invalidates.
            queryClient.invalidateQueries({ queryKey: ["warehouses"] });
            queryClient.invalidateQueries({ queryKey: ["warehouse-location"] });
            setCreatedLocationId(location.id);
            toast.success("Warehouse created successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to create warehouse");
        } finally {
            setIsSubmitting(false);
        }
    };

    const stepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Warehouse Details</h2>
                        <p className="text-sm text-zinc-500 mb-6">Enter the name, address, and location for this warehouse.</p>
                        <WarehouseDetailsStep defaultValues={warehouseData} onSubmit={handleDetailsSubmit} />
                    </div>
                );
            case 2:
                return warehouseData ? (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                            {createdLocationId ? "Done!" : "Review & Create"}
                        </h2>
                        {!createdLocationId && (
                            <p className="text-sm text-zinc-500 mb-6">Review your setup before creating the warehouse.</p>
                        )}
                        <WarehouseConfirmationStep
                            warehouseData={warehouseData}
                            createdLocationId={createdLocationId}
                            onEditStep={goToStep}
                        />
                    </div>
                ) : null;
            default:
                return null;
        }
    };

    const showFooterNext   = currentStep === 1;
    const showFooterSubmit = currentStep === TOTAL_STEPS && !createdLocationId;

    return (
        <div className="min-h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.push("/super-admin/warehouse")}
                    className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Warehouses
                </button>
                <h1 className="text-2xl font-semibold text-zinc-900">New Warehouse</h1>
                <p className="text-sm text-zinc-600 mt-1">Set up a new warehouse location for inventory storage.</p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-600">Step {currentStep} of {TOTAL_STEPS}</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                    />
                </div>
            </div>

            {/* Main layout */}
            <div className="flex-1 flex gap-8">
                {/* Sidebar — desktop only */}
                <div className="hidden lg:block w-56 flex-shrink-0">
                    <div className="sticky top-6">
                        <WarehouseWizardSidebar
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                            onStepClick={goToStep}
                        />
                    </div>
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white border border-zinc-200 rounded-xl p-6">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: direction * 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: direction * -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {stepContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer navigation */}
                    {!createdLocationId && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-200">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={currentStep === 1 || isSubmitting}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>

                            <div className="flex gap-2">
                                {showFooterNext && (
                                    <Button onClick={handleNext} disabled={isSubmitting}>
                                        Next <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                )}
                                {showFooterSubmit && (
                                    <Button onClick={handleSubmit} disabled={isSubmitting || !warehouseData}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Creating…
                                            </>
                                        ) : (
                                            "Create Warehouse"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/super-admin/warehouse/wizard/WarehouseSetupWizard.tsx
git commit -m "feat: add WarehouseSetupWizard orchestrator"
```

---

### Task 6: Page shell + manual smoke test

**Files:**
- Create: `app/(dashboard)/super-admin/warehouse/new/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";

import WarehouseSetupWizard from "@/components/super-admin/warehouse/wizard/WarehouseSetupWizard";

export default function NewWarehousePage() {
    return <WarehouseSetupWizard />;
}
```

- [ ] **Step 2: Run build to verify no type errors**

```bash
npm run build 2>&1 | head -40
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Start dev server and smoke-test**

```bash
npm run dev
```

Navigate to `http://localhost:3000/super-admin/warehouse/new` and verify:
- Step 1 shows "Warehouse Details" form with name, address fields, map, active toggle
- Clicking Next without filling required fields shows validation errors
- Filling all required fields and clicking Next advances to Step 2 with the review card
- "Edit" on the review card returns to Step 1 with values preserved
- Clicking "Create Warehouse" calls the mutation; on success shows the green success screen
- "View Warehouse" link navigates to the new warehouse's page
- `/super-admin/warehouse` list shows the new warehouse

- [ ] **Step 4: Commit**

```bash
git add app/"(dashboard)"/super-admin/warehouse/new/page.tsx
git commit -m "feat: add /super-admin/warehouse/new wizard page"
```
