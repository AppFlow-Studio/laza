'use client'

import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useBulkApplyMarkup } from '@/lib/hooks/mutations/useBulkApplyMarkup'

type Item = {
  id: number
  name: string
  is_warehouse_item: boolean
  current_unit_cost?: number | null
  item_warehouse_pricing?: { warehouse_transfer_price: number } | null
}

type Props = {
  open: boolean
  onClose: () => void
  selectedItems: Item[]
}

export function BulkMarkupModal({ open, onClose, selectedItems }: Props) {
  const [mode, setMode] = React.useState<'percentage_increase' | 'markup_over_cost'>('percentage_increase')
  const [markupPct, setMarkupPct] = React.useState(10)
  const [reason, setReason] = React.useState('')
  const [confirmed, setConfirmed] = React.useState(false)
  const { mutate, isPending } = useBulkApplyMarkup()

  const warehouseItems = selectedItems.filter((i) => i.is_warehouse_item)

  const preview = warehouseItems.map((item) => {
    const currentPrice = item.item_warehouse_pricing?.warehouse_transfer_price ?? null
    const cost = item.current_unit_cost ?? null
    const skipped = mode === 'markup_over_cost' && cost == null

    let newPrice: number | null = null
    if (!skipped) {
      if (mode === 'percentage_increase' && currentPrice != null) {
        newPrice = Math.round(currentPrice * (1 + markupPct / 100) * 10000) / 10000
      } else if (mode === 'markup_over_cost' && cost != null) {
        newPrice = Math.round(cost * (1 + markupPct / 100) * 10000) / 10000
      }
    }

    const delta = newPrice != null && currentPrice != null ? newPrice - currentPrice : null

    return { ...item, currentPrice, newPrice, delta, skipped }
  })

  const validRows = preview.filter((r) => !r.skipped && r.newPrice != null)
  const canConfirm = validRows.length > 0 && !isPending

  function handleConfirm() {
    setConfirmed(true)
    mutate(
      {
        itemIds: validRows.map((r) => r.id),
        mode,
        markupPct,
        reason: reason || undefined,
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            setConfirmed(false)
            onClose()
          }, 300)
        },
        onError: () => setConfirmed(false),
      }
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-background border border-border shadow-lg p-6 space-y-5">

        <div>
          <h2 className="text-base font-medium">Apply bulk markup</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {warehouseItems.length} warehouse item(s) selected
          </p>
        </div>

        {/* Mode selector */}
        <div className="space-y-2">
          {[
            { value: 'percentage_increase', label: 'Apply % increase to current prices' },
            { value: 'markup_over_cost', label: 'Set markup over landed cost' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value as typeof mode)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        {/* Markup % input */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Markup %</label>
          <input
            type="number"
            step="0.1"
            value={markupPct}
            onChange={(e) => setMarkupPct(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Reason (optional)</label>
          <input
            type="text"
            placeholder="e.g. China price increase Q2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Live preview table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Current</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">New</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Δ</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <AnimatePresence key={row.id}>
                  <motion.tr
                    className={row.skipped ? 'opacity-40' : ''}
                    animate={confirmed && !row.skipped ? { backgroundColor: ['#ffffff', '#dcfce7', '#ffffff'] } : {}}
                    transition={{ duration: 0.15 }}
                  >
                    <td className="px-3 py-2">
                      {row.name}
                      {row.skipped && (
                        <span className="ml-2 text-xs text-muted-foreground" title="No landed cost set">
                          (no cost)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {row.currentPrice != null ? `$${row.currentPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.newPrice != null ? `$${row.newPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right ${row.delta != null && row.delta > 0 ? 'text-green-600' : row.delta != null && row.delta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {row.delta != null ? `${row.delta > 0 ? '+' : ''}$${row.delta.toFixed(2)}` : '—'}
                    </td>
                  </motion.tr>
                </AnimatePresence>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-40"
          >
            {isPending ? 'Applying...' : `Apply to ${validRows.length} item(s)`}
          </button>
        </div>

      </div>
    </div>
  )
}
