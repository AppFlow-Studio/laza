"use client";

// ─── components/orders/CancelOrderDialog.tsx ─────────────────────────────────
//
// TASK 3.4 — Store Admin: Ticket Cancellation
//
// Cancel button is ONLY rendered when status === "submitted".
// The dialog requires an explicit click to confirm — no accidental cancels.
// On confirm: useCancelTicket() → status → "cancelled" + log entry.
//
// Rules enforced here (matching Task 3.4 spec):
//   ✅  Only shows when status = "submitted"
//   ✅  Confirmation dialog before firing mutation
//   ✅  Hidden/null for processing, fulfilled, confirmed, rejected, cancelled
//   ✅  Log entry + payment hold release handled inside useCancelTicket()
//
// Usage (store admin ticket detail page):
//   import { CancelOrderDialog } from "@/components/orders/CancelOrderDialog";
//
//   <CancelOrderDialog
//     ticketId={ticket.id}
//     status={ticket.status}
//     onCancelled={() => router.push("/admin/orders")}
//   />

import { useState } from "react";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useCancelTicket } from "@/lib/hooks/queries/useOrderTickets";

type TicketStatus =
    | "draft"
    | "submitted"
    | "processing"
    | "fulfilled"
    | "in_transit"
    | "delivered"
    | "confirmed"
    | "rejected"
    | "cancelled";

interface CancelOrderDialogProps {
    ticketId: string;
    status: TicketStatus;
    /** Called after successful cancellation so parent can navigate away */
    onCancelled?: () => void;
}

export function CancelOrderDialog({
    ticketId,
    status,
    onCancelled,
}: CancelOrderDialogProps) {
    const [open, setOpen] = useState(false);

    const { mutate: cancelTicket, isPending } = useCancelTicket();

    // ── Guard: only show the button for "submitted" ──────────────────────────
    // Task 3.4: "Cancel button ONLY visible when status = 'submitted'.
    //            Hidden/disabled for processing, fulfilled, confirmed."
    // Returning null here means the parent doesn't need to conditionally render.
    if (status !== "submitted") return null;

    function handleCancel() {
        cancelTicket(
            ticketId,
            {
                onSuccess: () => {
                    toast.success("Order cancelled.");
                    setOpen(false);
                    onCancelled?.();
                },
                onError: (err: Error) => {
                    toast.error(err.message ?? "Failed to cancel order.");
                },
            },
        );
    }

    return (
        <>
            {/* Trigger button — matches the style used in ticket detail topbar */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
            >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel Order
            </Button>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the order from the warehouse queue.
                            Once cancelled, the super admin will no longer see
                            it.{" "}
                            <strong className="text-foreground">
                                This cannot be undone.
                            </strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>
                            Keep order
                        </AlertDialogCancel>

                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={isPending}
                        >
                            {isPending ? "Cancelling…" : "Yes, cancel order"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
