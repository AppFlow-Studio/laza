"use client";

import { motion } from "motion/react";
import {
    MapPin,
    Users,
    Box,
    Edit,
    Trash2,
    Eye,
    AlertTriangle,
} from "lucide-react";
import { Location } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type LocationWithMeta = Location & {
    employees?: { id: string }[];
    storage_spaces?: { id: string }[];
    total_inventory_value?: number;
};

interface LocationListProps {
    locations: LocationWithMeta[];
    onEdit?: (location: Location) => void;
    onDelete?: (location: LocationWithMeta) => void;
    viewMode?: "grid" | "list";
}

function DeleteDialog({
    location,
    open,
    onConfirm,
    onCancel,
}: {
    location: LocationWithMeta | null;
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-xl font-semibold text-zinc-900">
                            Delete Location
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-base text-zinc-600 pt-2">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-zinc-900">
                            "{location?.name}"
                        </span>
                        ? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel
                        onClick={onCancel}
                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                    >
                        Delete Location
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function LocationCard({
    locations,
    onEdit,
    onDelete,
    viewMode = "grid",
}: LocationListProps) {
    const [locationToDelete, setLocationToDelete] =
        useState<LocationWithMeta | null>(null);

    const handleDeleteClick = (location: LocationWithMeta) =>
        setLocationToDelete(location);

    const handleConfirmDelete = () => {
        if (locationToDelete && onDelete) onDelete(locationToDelete);
        setLocationToDelete(null);
    };

    const getAddress = (location: LocationWithMeta) => {
        const address =
            typeof location.address === "string"
                ? JSON.parse(location.address)
                : location.address;
        return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
    };

    if (viewMode === "list") {
        return (
            <>
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Employees</TableHead>
                                <TableHead>Storage</TableHead>
                                <TableHead>Inventory Value</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {locations.map((location) => (
                                <TableRow key={location.id}>
                                    <TableCell className="font-medium">
                                        {location.name}
                                    </TableCell>
                                    <TableCell className="text-zinc-500">
                                        {getAddress(location)}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={cn(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                location.is_active
                                                    ? "bg-emerald-50 text-emerald-600"
                                                    : "bg-zinc-100 text-zinc-600",
                                            )}
                                        >
                                            {location.is_active
                                                ? "Active"
                                                : "Inactive"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-zinc-600">
                                        {location.employees?.length || 0}
                                    </TableCell>
                                    <TableCell className="text-zinc-600">
                                        {location.storage_spaces?.length || 0}
                                    </TableCell>
                                    <TableCell className="text-zinc-600">
                                        $
                                        {location.total_inventory_value?.toLocaleString() ||
                                            "0"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/super-admin/locations/${location.id}`}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            {onEdit && (
                                                <button
                                                    onClick={() =>
                                                        onEdit(location)
                                                    }
                                                    className="p-2 text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() =>
                                                        handleDeleteClick(
                                                            location,
                                                        )
                                                    }
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <DeleteDialog
                    location={locationToDelete}
                    open={!!locationToDelete}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setLocationToDelete(null)}
                />
            </>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((location) => (
                    <motion.div
                        key={location.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                                    {location.name}
                                </h3>
                                <p className="text-sm text-zinc-600">
                                    {getAddress(location)}
                                </p>
                            </div>
                            <span
                                className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    location.is_active
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-zinc-100 text-zinc-600",
                                )}
                            >
                                {location.is_active ? "Active" : "Inactive"}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-zinc-400" />
                                <div>
                                    <p className="text-xs text-zinc-500">
                                        Employees
                                    </p>
                                    <p className="text-sm font-semibold text-zinc-900">
                                        {location.employees?.length || 0}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 text-zinc-400" />
                                <div>
                                    <p className="text-xs text-zinc-500">
                                        Storage
                                    </p>
                                    <p className="text-sm font-semibold text-zinc-900">
                                        {location.storage_spaces?.length || 0}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-zinc-400" />
                                <div>
                                    <p className="text-xs text-zinc-500">
                                        Value
                                    </p>
                                    <p className="text-sm font-semibold text-zinc-900">
                                        $
                                        {location.total_inventory_value?.toLocaleString() ||
                                            "0"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-zinc-200">
                            <Link
                                href={`/super-admin/locations/${location.id}`}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                            >
                                <Eye className="w-4 h-4" />
                                View
                            </Link>
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(location)}
                                    className="flex items-center justify-center px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => handleDeleteClick(location)}
                                    className="flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
            <DeleteDialog
                location={locationToDelete}
                open={!!locationToDelete}
                onConfirm={handleConfirmDelete}
                onCancel={() => setLocationToDelete(null)}
            />
        </>
    );
}