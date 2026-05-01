"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { useCreateStorePurchase } from "@/lib/hooks/queries/useStorePurchases";
import { useItems } from "@/lib/hooks/queries/useItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const lineItemSchema = z.object({
  itemId:         z.number().min(1, "Select an item"),
  quantity:       z.number().positive("Must be > 0"),
  unitCost:       z.number().min(0, "Must be ≥ 0"),
  storageSpaceId: z.string().nullable().optional(),
});

const formSchema = z.object({
  purchasedAt:  z.string().min(1, "Date is required"),
  supplierName: z.string().optional(),
  notes:        z.string().optional(),
  items:        z.array(lineItemSchema).min(1, "Add at least one item"),
});

type FormData = z.infer<typeof formSchema>;

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default function NewPurchaseForm() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { user } = useUser();
  const { selectedLocationId } = useAdminStore();
  const { data: location } = useLocationWithDetails(selectedLocationId);
  const storageSpaces = location?.storage_spaces ?? [];
  const { data: catalogItems } = useItems();
  const createMutation = useCreateStorePurchase();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchasedAt: format(new Date(), "yyyy-MM-dd"),
      supplierName: "",
      notes: "",
      items: [{ itemId: 0, quantity: 1, unitCost: 0, storageSpaceId: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const runningTotal = watchedItems.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0),
    0
  );

  const onSubmit = async (data: FormData) => {
    if (!organization?.id || !user?.id || !selectedLocationId) {
      toast.error("Missing org, user, or location context");
      return;
    }
    try {
      const purchaseId = await createMutation.mutateAsync({
        orgId:        organization.id,
        locationId:   selectedLocationId,
        purchasedBy:  user.id,
        purchasedAt:  new Date(data.purchasedAt).toISOString(),
        supplierName: data.supplierName || null,
        notes:        data.notes || null,
        items:        data.items.map((i) => ({
          itemId:         i.itemId,
          quantity:       i.quantity,
          unitCost:       i.unitCost,
          storageSpaceId: i.storageSpaceId ?? null,
        })),
      });
      toast.success("Purchase recorded and inventory updated");
      router.push(`/admin/purchases/${purchaseId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save purchase";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Header fields */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-900">Purchase Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="purchasedAt">Purchase Date *</Label>
            <Input
              id="purchasedAt"
              type="date"
              {...register("purchasedAt")}
            />
            {errors.purchasedAt && (
              <p className="text-xs text-red-500">{errors.purchasedAt.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplierName">Supplier (optional)</Label>
            <Input
              id="supplierName"
              placeholder="e.g. Local Market, Costco"
              {...register("supplierName")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional details…"
            rows={2}
            {...register("notes")}
          />
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-900">Items</h2>
        {errors.items?.root && (
          <p className="text-xs text-red-500">{errors.items.root.message}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => {
            const lineTotal = (watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitCost || 0);
            return (
              <div key={field.id} className="grid grid-cols-[1fr_160px_100px_120px_80px_32px] gap-2 items-start">
                {/* Item select */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Item</Label>}
                  <Controller
                    control={control}
                    name={`items.${index}.itemId`}
                    render={({ field }) => (
                      <select
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className={`w-full border rounded-md px-3 py-2 text-sm ${errors.items?.[index]?.itemId ? "border-red-400" : "border-input"}`}
                      >
                        <option value="">Select item…</option>
                        {(catalogItems ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name ?? ""}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                {/* Storage space select */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Storage Space</Label>}
                  <Controller
                    control={control}
                    name={`items.${index}.storageSpaceId`}
                    render={({ field }) => (
                      <select
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="w-full border border-input rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {storageSpaces.map((ss) => (
                          <option key={ss.id} value={ss.id}>
                            {ss.name ?? ss.id}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                {/* Quantity */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Qty</Label>}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    className={errors.items?.[index]?.quantity ? "border-red-400" : ""}
                  />
                </div>

                {/* Unit cost */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Unit cost ($)</Label>}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
                    className={errors.items?.[index]?.unitCost ? "border-red-400" : ""}
                  />
                </div>

                {/* Line total */}
                <div>
                  {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Total</Label>}
                  <div className="h-9 flex items-center text-sm text-zinc-600 font-medium">
                    {formatCurrency(lineTotal)}
                  </div>
                </div>

                {/* Remove */}
                <div className={index === 0 ? "mt-6" : ""}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-zinc-400 hover:text-red-500"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ itemId: 0, quantity: 1, unitCost: 0, storageSpaceId: null })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add item
        </Button>
      </div>

      {/* Footer with total + submit */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">Total</p>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(runningTotal)}</p>
        </div>
        <Button type="submit" disabled={createMutation.isPending} className="px-8">
          {createMutation.isPending ? "Saving…" : "Save Purchase"}
        </Button>
      </div>
    </form>
  );
}
