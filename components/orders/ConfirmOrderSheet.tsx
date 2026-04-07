"use client";

/**
 * components/orders/ConfirmOrderSheet.tsx
 *
 * Employee-facing bottom sheet for confirming order receipt.
 * Each item is pre-filled with the expected box count from the warehouse.
 * Employee changes the value if what physically arrived differs.
 *
 * Discrepant rows are highlighted in amber live as the employee types.
 * On submit, actual quantities go to the store inventory (not expected),
 * and the discrepancy is logged for super admin review.
 *
 * Usage:
 *   <ConfirmOrderSheet
 *     open={sheetOpen}
 *     onOpenChange={setSheetOpen}
 *     ticketId={ticket.id}
 *     lineItems={ticket.order_ticket_items.map(i => ({
 *       itemId: i.item_id,
 *       itemName: i.items.name,
 *       fulfilledBoxes: i.fulfilled_boxes ?? 0,
 *     }))}
 *     onConfirmed={(hasDiscrepancy) => router.push("/employee")}
 *   />
 */

import { useState }      from "react";
import { toast }         from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Badge }  from "@/components/ui/badge";
import { useConfirmTicket } from "@/lib/hooks/queries/useOrderTickets";
import type { ReceivedItem } from "@/lib/supabase/queries/orderTickets";
import { getFriendlyErrorMessage } from "@/lib/utils/errorMessages";

interface LineItem {
	itemId:         number;
	itemName:       string;
	/** How many boxes the warehouse said it sent */
	fulfilledBoxes: number;
}

interface ConfirmOrderSheetProps {
	open:         boolean;
	onOpenChange: (open: boolean) => void;
	ticketId:     string;
	lineItems:    LineItem[];
	/** Called after successful confirmation with whether a discrepancy was logged */
	onConfirmed?: (hasDiscrepancy: boolean) => void;
}

export function ConfirmOrderSheet({
									  open,
									  onOpenChange,
									  ticketId,
									  lineItems,
									  onConfirmed,
								  }: ConfirmOrderSheetProps) {
	// Pre-fill every item with its expected (fulfilled) count
	const [counts, setCounts] = useState<Record<number, string>>(() =>
		Object.fromEntries(lineItems.map((li) => [li.itemId, String(li.fulfilledBoxes)])),
	);

	const { mutate: confirm, isPending } = useConfirmTicket();

	// Compute discrepant items live so the UI reacts as the employee types
	const discrepantItems = lineItems.filter((li) => {
		const actual = parseInt(counts[li.itemId] ?? "", 10);
		return !isNaN(actual) && actual !== li.fulfilledBoxes;
	});
	const hasAnyDiscrepancy = discrepantItems.length > 0;

	function handleChange(itemId: number, value: string) {
		// Only allow non-negative integers
		if (value === "" || /^\d+$/.test(value)) {
			setCounts((prev) => ({ ...prev, [itemId]: value }));
		}
	}

	function handleConfirm() {
		// All fields must have a valid non-negative integer before submitting
		const invalid = lineItems.filter(
			(li) => counts[li.itemId] === "" || isNaN(parseInt(counts[li.itemId], 10)),
		);
		if (invalid.length > 0) {
			toast.error(
				`Please enter a count for: ${invalid.map((i) => i.itemName).join(", ")}`,
			);
			return;
		}

		const receivedItems: ReceivedItem[] = lineItems.map((li) => ({
			itemId:              li.itemId,
			actualBoxesReceived: parseInt(counts[li.itemId], 10),
		}));

		confirm(
			{ ticketId, receivedItems },
			{
				onSuccess: (result) => {
					if (result.hasDiscrepancy) {
						toast(
							`Order confirmed with ${result.discrepancies.length} discrepanc${
								result.discrepancies.length === 1 ? "y" : "ies"
							}. Logged for super admin review.`,
							{ icon: "⚠️", duration: 5000 },
						);
					} else {
						toast.success("Order confirmed — all quantities match.");
					}
					onOpenChange(false);
					onConfirmed?.(result.hasDiscrepancy);
				},
				onError: (err: Error) => {
					toast.error(getFriendlyErrorMessage(err));
				},
			},
		);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
				<SheetHeader className="pb-4">
					<SheetTitle>Confirm Received Order</SheetTitle>
					<SheetDescription>
						Enter the number of boxes you physically counted for each item.
						Values are pre-filled with what the warehouse sent — only change
						if your count differs.
					</SheetDescription>
				</SheetHeader>

				{/* Discrepancy warning banner — appears as soon as any count diverges */}
				{hasAnyDiscrepancy && (
					<div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<span>
              {discrepantItems.length} item
							{discrepantItems.length !== 1 ? "s differ" : " differs"} from
              expected. The discrepancy will be logged for super admin review.
              The order will still confirm.
            </span>
					</div>
				)}

				{/* Item rows */}
				<div className="space-y-3 py-2">
					{lineItems.map((li) => {
						const actual       = parseInt(counts[li.itemId] ?? "", 10);
						const isDiscrepant = !isNaN(actual) && actual !== li.fulfilledBoxes;
						const diff         = isNaN(actual) ? 0 : actual - li.fulfilledBoxes;

						return (
							<div
								key={li.itemId}
								className={`rounded-lg border p-3 transition-colors ${
									isDiscrepant
										? "border-amber-300 bg-amber-50"
										: "border-border bg-background"
								}`}
							>
								<div className="mb-2 flex items-center justify-between gap-2">
									<Label
										htmlFor={`item-${li.itemId}`}
										className="text-sm font-medium leading-tight"
									>
										{li.itemName}
									</Label>
									<div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Expected: {li.fulfilledBoxes} box{li.fulfilledBoxes !== 1 ? "es" : ""}
                    </span>
										{isDiscrepant && (
											<Badge
												variant="outline"
												className="border-amber-400 bg-amber-100 text-xs text-amber-800"
											>
												{diff > 0 ? `+${diff}` : diff} box{Math.abs(diff) !== 1 ? "es" : ""}
											</Badge>
										)}
									</div>
								</div>

								<Input
									id={`item-${li.itemId}`}
									type="number"
									inputMode="numeric"
									min={0}
									value={counts[li.itemId]}
									onChange={(e) => handleChange(li.itemId, e.target.value)}
									className={`h-11 text-center text-lg font-semibold ${
										isDiscrepant
											? "border-amber-400 focus-visible:ring-amber-400"
											: ""
									}`}
									placeholder={String(li.fulfilledBoxes)}
								/>
							</div>
						);
					})}
				</div>

				<SheetFooter className="gap-2 pt-4">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
						className="flex-1"
					>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={isPending}
						className="flex-1"
					>
						{isPending
							? "Confirming…"
							: hasAnyDiscrepancy
								? "Confirm with Discrepancies"
								: "Confirm Receipt"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}