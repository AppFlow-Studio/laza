"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useInventoryUpdateRequests,
  useApproveInventoryUpdateRequest,
  useRejectInventoryUpdateRequest,
} from "@/lib/hooks/queries/useInventoryUpdateRequests";
import { useAdminStore } from "@/lib/stores/adminStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

type Tab = "pending" | "history";

export default function PendingRequestsPanel() {
  const { user } = useUser();
  const { selectedLocationId } = useAdminStore();
  const [tab, setTab] = useState<Tab>("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data: pendingRequests, isLoading: pendingLoading } =
    useInventoryUpdateRequests("pending", selectedLocationId ?? undefined);
  const { data: allRequests, isLoading: allLoading } =
    useInventoryUpdateRequests(undefined, selectedLocationId ?? undefined);

  const approveMutation = useApproveInventoryUpdateRequest();
  const rejectMutation  = useRejectInventoryUpdateRequest();

  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  const reviewed = (allRequests ?? []).filter(
    (r) => r.status === "approved" || r.status === "rejected"
  );

  const pending = pendingRequests ?? [];
  const isLoading = tab === "pending" ? pendingLoading : allLoading;
  const requests  = tab === "pending" ? pending : reviewed;

  const handleApprove = async (requestId: string) => {
    if (!user?.id) return;
    try {
      await approveMutation.mutateAsync({ requestId, reviewedBy: user.id });
      toast.success("Request approved and inventory updated");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      toast.error(message);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user?.id) return;
    try {
      await rejectMutation.mutateAsync({
        requestId,
        reviewedBy: user.id,
        reviewNote: rejectNote || null,
      });
      toast.success("Request rejected");
      setRejectingId(null);
      setRejectNote("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject";
      toast.error(message);
    }
  };

  const openReject = (id: string) => {
    setRejectNote("");
    setRejectingId(id);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-100">
        <button
          className={`px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "pending"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
          onClick={() => setTab("pending")}
        >
          Pending Requests
          {pending.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
              {pending.length}
            </span>
          )}
        </button>
        <button
          className={`px-5 py-3 text-sm font-medium transition-colors ${
            tab === "history"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="divide-y divide-zinc-50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">
            {tab === "pending" ? "No pending requests." : "No request history."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {requests.map((req) => (
            <div key={req.id} className="px-6 py-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-zinc-900">
                      {(req as any).items?.name ?? `Item #${req.item_id}`}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {req.action_type}
                    </Badge>
                    {req.status !== "pending" && (
                      <Badge
                        variant={req.status === "approved" ? "default" : "destructive"}
                        className="text-xs capitalize"
                      >
                        {req.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(req as any).storage_spaces?.name
                      ? `${(req as any).storage_spaces.name} · `
                      : ""}
                    {req.previous_quantity} → {req.new_quantity}
                    {" "}
                    {(req as any).items?.unit_of_measure ?? "units"}
                    {" · "}
                    {req.requested_by}
                    {" · "}
                    {format(parseISO(req.created_at), "MMM d, h:mm a")}
                  </p>
                  {req.notes && (
                    <p className="text-xs text-zinc-400 mt-0.5 italic">&quot;{req.notes}&quot;</p>
                  )}
                  {req.review_note && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Admin note: {req.review_note}
                    </p>
                  )}
                </div>

                {req.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    {rejectingId === req.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <Textarea
                          placeholder="Rejection reason (optional)"
                          rows={2}
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isProcessing}
                            onClick={() => handleReject(req.id)}
                          >
                            Confirm Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setRejectingId(null); setRejectNote(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          disabled={isProcessing}
                          onClick={() => handleApprove(req.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => openReject(req.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
