"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Plus,
    Trash2,
    Snowflake,
    Thermometer,
    Sun,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const storageSpaceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    temperature_type: z.enum(["frozen", "refrigerated", "dry"]),
});

type StorageSpaceFormData = z.infer<typeof storageSpaceSchema>;

export type WizardStorageSpace = {
    tempId: string;
    name: string;
    temperature_type: "frozen" | "refrigerated" | "dry";
};

const TEMP_TYPE_CONFIG = {
    frozen: {
        icon: Snowflake,
        label: "Frozen",
        color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    refrigerated: {
        icon: Thermometer,
        label: "Refrigerated",
        color: "text-cyan-600 bg-cyan-50 border-cyan-200",
    },
    dry: {
        icon: Sun,
        label: "Dry Storage",
        color: "text-amber-600 bg-amber-50 border-amber-200",
    },
} as const;

const SUGGESTIONS: {
    name: string;
    temperature_type: "frozen" | "refrigerated" | "dry";
}[] = [
    { name: "Walk-in Freezer", temperature_type: "frozen" },
    { name: "Display Case", temperature_type: "refrigerated" },
    { name: "Back Fridge", temperature_type: "refrigerated" },
    { name: "Dry Storage", temperature_type: "dry" },
    { name: "Prep Counter", temperature_type: "dry" },
];

interface StorageSpacesStepProps {
    storageSpaces: WizardStorageSpace[];
    onAdd: (space: WizardStorageSpace) => void;
    onRemove: (tempId: string) => void;
}

export default function StoreStorageSpacesStep({
    storageSpaces,
    onAdd,
    onRemove,
}: StorageSpacesStepProps) {
    const [showForm, setShowForm] = useState(storageSpaces.length === 0);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isValid },
    } = useForm<StorageSpaceFormData>({
        resolver: zodResolver(storageSpaceSchema),
        defaultValues: { name: "", temperature_type: "dry" },
        mode: "onChange",
    });

    const onSubmitForm = (data: StorageSpaceFormData) => {
        onAdd({
            tempId: crypto.randomUUID(),
            name: data.name,
            temperature_type: data.temperature_type,
        });
        reset();
        setShowForm(false);
    };

    const addSuggestion = (s: (typeof SUGGESTIONS)[number]) => {
        if (storageSpaces.some((sp) => sp.name === s.name)) return;
        onAdd({
            tempId: crypto.randomUUID(),
            name: s.name,
            temperature_type: s.temperature_type,
        });
    };

    const unusedSuggestions = SUGGESTIONS.filter(
        (s) => !storageSpaces.some((sp) => sp.name === s.name),
    );

    return (
        <div className="space-y-4">
            {/* Quick-add suggestions */}
            {unusedSuggestions.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Quick add
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {unusedSuggestions.map((s) => {
                            const cfg = TEMP_TYPE_CONFIG[s.temperature_type];
                            const Icon = cfg.icon;
                            return (
                                <button
                                    key={s.name}
                                    type="button"
                                    onClick={() => addSuggestion(s)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                >
                                    <Icon className="w-3 h-3" />
                                    {s.name}
                                    <Plus className="w-3 h-3" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Existing spaces */}
            {storageSpaces.length > 0 && (
                <div className="space-y-2">
                    {storageSpaces.map((space) => {
                        const config = TEMP_TYPE_CONFIG[space.temperature_type];
                        const Icon = config.icon;
                        return (
                            <div
                                key={space.tempId}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-xl border",
                                    config.color,
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {space.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {config.label}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemove(space.tempId)}
                                    className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Custom add form */}
            {showForm ? (
                <div className="border border-gray-200 rounded-xl p-4">
                    <form
                        onSubmit={handleSubmit(onSubmitForm)}
                        className="space-y-4"
                    >
                        <div>
                            <label
                                htmlFor="space-name"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Storage Space Name{" "}
                                <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="space-name"
                                {...register("name")}
                                placeholder="e.g., Freezer A, Dry Storage 1"
                                className={cn(
                                    "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                                    errors.name
                                        ? "border-rose-400 focus:ring-rose-500"
                                        : "border-gray-200 focus:ring-indigo-500",
                                )}
                            />
                            {errors.name && (
                                <p className="text-xs text-rose-500 font-medium mt-1">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="temp-type"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Temperature Type
                            </label>
                            <select
                                id="temp-type"
                                {...register("temperature_type")}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none"
                            >
                                <option value="dry">Dry Storage</option>
                                <option value="refrigerated">
                                    Refrigerated
                                </option>
                                <option value="frozen">Frozen</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={!isValid}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                            {storageSpaces.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        reset();
                                    }}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Custom Space
                </button>
            )}

            {storageSpaces.length === 0 && !showForm && (
                <p className="text-sm text-gray-500 text-center py-4">
                    Add at least one storage space to continue.
                </p>
            )}
        </div>
    );
}