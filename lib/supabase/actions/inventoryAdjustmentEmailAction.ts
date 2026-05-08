"use server";

import { sendInventoryAdjustmentNotification } from "@/lib/services/inventoryAdjustmentNotification";

export async function notifyAdminOfAdjustment(result: { id: string }): Promise<void> {
    await sendInventoryAdjustmentNotification(result.id);
}
