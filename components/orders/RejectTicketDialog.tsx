// ─── components/orders/RejectTicketDialog.tsx ────────────────────────────────
//
// Drop-in dialog for the super admin ticket detail page.
// The confirm button stays disabled until text is entered.
//
// Usage:
//   <RejectTicketDialog
//     ticketId={ticket.id}
//     onRejected={() => router.push('/super-admin/orders')}
//   />

"use client";

import { useState } from "react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { toast }    from "react-hot-toast";
import { useRejectTicket } from "@/lib/hooks/queries/useOrderTickets";
import { getFriendlyErrorMessage } from "@/lib/utils/errorMessages";

interface RejectTicketDialogProps {
	ticketId: string;
	/** Called after a successful rejection so the parent can navigate away */
	onRejected?: () => void;
}

export function RejectTicketDialog({
									   ticketId,
									   onRejected,
								   }: RejectTicketDialogProps) {
	const [open, setOpen]               = useState(false);
	const [reason, setReason]           = useState("");
	const { mutate: reject, isPending } = useRejectTicket();

	const trimmedReason = reason.trim();
	const canSubmit     = trimmedReason.length > 0 && !isPending;

	function handleReject() {
		if (!canSubmit) return;
		reject(
			{ ticketId, rejectionReason: trimmedReason },
			{
				onSuccess: () => {
					toast.success("Ticket rejected.");
					setOpen(false);
					setReason("");
					onRejected?.();
				},
				onError: (err: Error) => {
					toast.error(getFriendlyErrorMessage(err));
				},
			},
		);
	}

	return (
		<>
			<Button variant="destructive" onClick={() => setOpen(true)}>
				Reject
			</Button>

			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reject this order?</AlertDialogTitle>
						<AlertDialogDescription>
							The store admin will be notified with your reason and can
							resubmit with adjusted quantities.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="space-y-2 py-2">
						<Label htmlFor="rejection-reason">
							Reason <span className="text-destructive">*</span>
						</Label>
						<Textarea
							id="rejection-reason"
							placeholder="e.g. Nutella is currently out of stock. Please resubmit for 5 boxes or fewer."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={3}
							className="resize-none"
							autoFocus
						/>
						{reason.length > 0 && trimmedReason.length === 0 && (
							<p className="text-sm text-destructive">Reason cannot be blank.</p>
						)}
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel
							disabled={isPending}
							onClick={() => setReason("")}
						>
							Cancel
						</AlertDialogCancel>

						{/* Disabled until text is entered — enforced here AND in rejectTicket() */}
						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={!canSubmit}
						>
							{isPending ? "Rejecting…" : "Confirm Rejection"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}