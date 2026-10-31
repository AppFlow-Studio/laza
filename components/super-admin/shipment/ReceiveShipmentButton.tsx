"use client";

import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceiveShipmentButtonProps {
    poId: string;
    poStatus: string;
    /** The warehouseId from the URL param — used to construct the route */
    warehouseId: string;
}

const RECEIVABLE_STATUSES = ["in_transit", "arrived"];

export function ReceiveShipmentButton({
                                          poId,
                                          poStatus,
                                          warehouseId,
                                      }: ReceiveShipmentButtonProps) {
    const router = useRouter();

    if (!RECEIVABLE_STATUSES.includes(poStatus)) return null;

    return (
        <Button
            onClick={() =>
                router.push(
                    `/super-admin/warehouse/${warehouseId}/purchase-orders/${poId}/receive`
                )
            }
            className="inline-flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
        >
            <PackageCheck className="h-4 w-4" />
            Receive Shipment
        </Button>
    );
}