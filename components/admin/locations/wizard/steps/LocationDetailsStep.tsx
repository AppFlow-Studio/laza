"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

const locationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    location_type: z.enum(["store", "warehouse"]),
    address: z.object({
        street: z.string().min(1, "Street is required"),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State is required"),
        zip: z.string().min(1, "ZIP is required"),
        country: z.string().optional(),
    }),
    is_active: z.boolean(),
});

export type LocationFormData = z.infer<typeof locationSchema>;

interface LocationDetailsStepProps {
    defaultValues?: LocationFormData | null;
    onSubmit: (data: LocationFormData) => void;
}

export default function LocationDetailsStep({
    defaultValues,
    onSubmit,
}: LocationDetailsStepProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<LocationFormData>({
        resolver: zodResolver(locationSchema),
        defaultValues: defaultValues || {
            name: "",
            location_type: "store",
            address: {
                street: "",
                city: "",
                state: "",
                zip: "",
                country: "US",
            },
            is_active: true,
        },
    });

    const selectedType = watch("location_type");

    const inputClass = (hasError?: boolean) =>
        cn(
            "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
            hasError
                ? "border-rose-400 focus:ring-rose-500"
                : "border-gray-200 focus:ring-indigo-500",
        );

    return (
        <form
            id="location-details-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
        >
            {/* Location Name */}
            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Location Name <span className="text-rose-500">*</span>
                </label>
                <input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Downtown Cafe"
                    className={inputClass(!!errors.name)}
                />
                {errors.name && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.name.message}
                    </p>
                )}
            </div>

            {/* Location Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {(
                        [
                            {
                                value: "store",
                                icon: Store,
                                label: "Store",
                                description: "Customer-facing cafe location",
                            },
                            {
                                value: "warehouse",
                                icon: Warehouse,
                                label: "Warehouse",
                                description: "Central supply distribution hub",
                            },
                        ] as const
                    ).map(({ value, icon: Icon, label, description }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setValue("location_type", value)}
                            className={cn(
                                "p-4 border-2 rounded-xl text-left transition-all",
                                selectedType === value
                                    ? "border-indigo-500 bg-indigo-50"
                                    : "border-gray-200 hover:border-gray-300 bg-white",
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                                    <Icon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {label}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                {errors.location_type && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.location_type.message}
                    </p>
                )}
            </div>

            {/* Street Address */}
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
                />
                {errors.address?.zip && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.address.zip.message}
                    </p>
                )}
            </div>

            {/* Active toggle */}
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
        </form>
    );
}