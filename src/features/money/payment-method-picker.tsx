import { useLiveQuery } from "dexie-react-hooks"
import { Plus } from "lucide-react"
import { useState } from "react"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { db } from "@/lib/db"
import { cn } from "@/lib/utils"

import { PaymentMethodForm } from "./payment-method-form"
import { paymentType } from "./payment-methods"

/** Chip picker of active payment methods, with inline "add new". */
export function PaymentMethodPicker({
  value,
  onChange,
  label = "Paid with",
}: {
  value: string
  onChange: (id: string) => void
  label?: string
}) {
  const all = useLiveQuery(() => db.paymentMethods.orderBy("createdAt").toArray(), [])
  // Keep an archived method visible only when it's the current selection.
  const methods = all?.filter((m) => !m.archived || m.id === value)
  const [adding, setAdding] = useState(false)

  return (
    <>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {(methods ?? []).map((m) => {
          const Icon = paymentType(m.type).icon
          const selected = value === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(m.id)}
              className={cn(
                "inline-flex h-10 max-w-full items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{m.name}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          <Plus className="size-4" /> Add
        </button>
      </div>

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent>
          <PaymentMethodForm
            onDone={(id) => {
              setAdding(false)
              if (id) onChange(id)
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
