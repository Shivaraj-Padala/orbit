import { useForm } from "@tanstack/react-form"
import { Trash2 } from "lucide-react"

import { FormField } from "@/components/form-field"
import { visibleError } from "@/lib/form-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { PaymentMethod, PaymentMethodType } from "@/lib/db"
import { cn } from "@/lib/utils"

import {
  archivePaymentMethod,
  PAYMENT_TYPES,
  paymentMethodSchema,
  savePaymentMethod,
  type PaymentMethodValues,
} from "./payment-methods"

export function PaymentMethodForm({
  method,
  onDone,
}: {
  method?: PaymentMethod
  onDone: (id?: string) => void
}) {
  const defaultValues: PaymentMethodValues = {
    name: method?.name ?? "",
    type: method?.type ?? "credit_card",
  }
  const form = useForm({
    defaultValues,
    validators: { onChange: paymentMethodSchema, onSubmit: paymentMethodSchema },
    onSubmit: async ({ value }) => onDone(await savePaymentMethod(value, method)),
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <SheetHeader>
        <SheetTitle>{method ? "Edit payment method" : "New payment method"}</SheetTitle>
        <SheetDescription>Only a name and type are stored — never card numbers.</SheetDescription>
      </SheetHeader>

      <div className="grid grid-cols-1 gap-5 px-5">
        <form.Field name="type">
          {(field) => (
            <FormField label="Type">
              <div role="radiogroup" aria-label="Type" className="grid grid-cols-4 gap-2">
                {PAYMENT_TYPES.map(({ id, label, icon: Icon }) => {
                  const selected = field.state.value === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.handleChange(id as PaymentMethodType)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                      <span className="w-full truncate">{label}</span>
                    </button>
                  )
                })}
              </div>
            </FormField>
          )}
        </form.Field>

        <form.Field name="name">
          {(field) => {
            const error = visibleError(field.state.meta)
            return (
              <FormField id="pm-name" label="Name" error={error} hint="e.g. HDFC Millennia, SBI Debit, GPay">
                <Input
                  id="pm-name"
                  autoFocus={!method}
                  autoComplete="off"
                  placeholder="Card or account name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={!!error}
                />
              </FormField>
            )
          }}
        </form.Field>
      </div>

      <SheetFooter>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {method ? "Save changes" : "Add payment method"}
            </Button>
          )}
        </form.Subscribe>
        {method && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              await archivePaymentMethod(method.id)
              onDone()
            }}
          >
            <Trash2 /> Remove
          </Button>
        )}
      </SheetFooter>
    </form>
  )
}
