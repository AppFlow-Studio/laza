"use server";

// B1 (Munis): replace body with Resend email logic.
// Receives the newly-created inventory_update_requests.id and sends admin email.
export async function notifyAdminOfAdjustment(_requestId: string): Promise<void> {
    console.log("[B1 stub] notifyAdminOfAdjustment", _requestId);
}
