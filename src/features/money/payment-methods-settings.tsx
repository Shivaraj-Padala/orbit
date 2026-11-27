import { useLiveQuery } from "dexie-react-hooks"
import { ChevronRight, Plus } from "lucide-react"
import { useState } from "react"

import { Card } from "@/components/ui/card"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { db, type PaymentMethod } from "@/lib/db"

import { PaymentMethodForm } from "./payment-method-form"
import { paymentType } from "./payment-methods"

export function PaymentMethodsSettings() {
  const methods = useLiveQuery(
    () => db.paymentMethods.orderBy("createdAt").filter((m) => !m.archived).toArray(),
    []
  )
  const [sheet, setSheet] = useState<{ open: boolean; method?: PaymentMethod }>({ open: false })

  return (
    <>
      <Card className="gap-0 py-0">
        <ul className="divide-y">
          {(methods ?? []).map((m) => {
            const type = paymentType(m.type)
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSheet({ open: true, method: m })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <type.icon className="size-[18px]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{m.name}</p>
                    <p className="text-[13px] text-muted-foreground">{type.label}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setSheet({ open: true })}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium hover:bg-accent/50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <Plus className="size-[18px]" />
              </div>
              Add card, UPI or account
            </button>
          </li>
        </ul>
      </Card>
      <p className="mt-2 px-1 text-[13px] text-muted-foreground">
        Names only — card numbers are never stored.
      </p>

      <Sheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))}>
        <SheetContent>
          <PaymentMethodForm
            key={sheet.method?.id ?? "new"}
            method={sheet.method}
            onDone={() => setSheet((s) => ({ ...s, open: false }))}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
