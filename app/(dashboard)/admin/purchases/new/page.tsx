import NewPurchaseForm from "@/components/admin/purchases/NewPurchaseForm";

export default function NewPurchasePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Record Purchase</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Log items your store bought directly. Inventory will update immediately.
        </p>
      </div>
      <NewPurchaseForm />
    </div>
  );
}
