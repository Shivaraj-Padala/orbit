import { useForm } from "@tanstack/react-form"
import { Trash2 } from "lucide-react"

import { FormField } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { RecurringExpense, RecurringKind } from "@/lib/db"
import { formatMonth, toDateKey, toMonthKey } from "@/lib/dates"
import { visibleError } from "@/lib/form-errors"
import { formatMoney } from "@/lib/format"

import { AmountInput, CategoryPicker } from "./fields"
import { PaymentMethodPicker } from "./payment-method-picker"
import {
  deleteRecurring,
  monthsInclusive,
  recurringSchema,
  saveRecurring,
  type RecurringValues,
} from "./recurring"

export function RecurringForm({
  item,
  currency,
  defaultPaymentMethodId = "",
  onDone,
}: {
  item?: RecurringExpense
  currency: string
  defaultPaymentMethodId?: string
  onDone: () => void
}) {
  const defaultValues: RecurringValues = {
    kind: item?.kind ?? "bill",
    name: item?.name ?? "",
    amount: item ? String(item.amount) : "",
    category: item?.category ?? "",
    paymentMethodId: item?.paymentMethodId ?? defaultPaymentMethodId,
    dueDay: item ? String(item.dueDay) : String(Number(toDateKey().slice(8))),
    startMonth: item?.startMonth ?? toMonthKey(),
    endMonth: item?.endMonth ?? "",
    autoLog: item?.autoLog ?? true,
  }

  const form = useForm({
    defaultValues,
    validators: { onChange: recurringSchema, onSubmit: recurringSchema },
    onSubmit: async ({ value }) => {
      await saveRecurring(value, item)
      onDone()
    },
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
        <SheetTitle>{item ? "Edit fixed expense" : "New fixed expense"}</SheetTitle>
        <SheetDescription>Something you pay every month.</SheetDescription>
      </SheetHeader>

      <div className="grid grid-cols-1 gap-5 px-5">
        <form.Field
          name="kind"
          listeners={{
            onChange: ({ value }) => {
              // Suggest the matching category when it hasn't been chosen yet.
              const category = form.getFieldValue("category")
              if (value === "emi" && (!category || category === "bills" || category === "subscriptions")) {
                form.setFieldValue("category", "loans")
              }
              if (value === "bill" && category === "loans") form.setFieldValue("category", "")
            },
          }}
        >
          {(field) => (
            <ToggleGroup
              type="single"
              aria-label="Kind"
              value={field.state.value}
              onValueChange={(v) => v && field.handleChange(v as RecurringKind)}
            >
              <ToggleGroupItem value="bill">Recurring bill</ToggleGroupItem>
              <ToggleGroupItem value="emi">Loan / EMI</ToggleGroupItem>
            </ToggleGroup>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.kind}>
          {(kind) => (
            <form.Field name="name">
              {(field) => (
                <FormField id="rec-name" label="Name" error={visibleError(field.state.meta)}>
                  <Input
                    id="rec-name"
                    autoFocus={!item}
                    autoComplete="off"
                    placeholder={kind === "emi" ? "Car loan, Phone EMI…" : "Rent, Netflix, Electricity…"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!!visibleError(field.state.meta)}
                  />
                </FormField>
              )}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Subscribe selector={(s) => s.values.kind}>
          {(kind) => (
            <form.Field name="amount">
              {(field) => {
                const error = visibleError(field.state.meta)
                return (
                  <FormField
                    id="rec-amount"
                    label={kind === "emi" ? "Monthly EMI" : "Amount each month"}
                    error={error}
                  >
                    <AmountInput
                      id="rec-amount"
                      currency={currency}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={!!error}
                    />
                  </FormField>
                )
              }}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="category">
          {(field) => (
            <FormField label="Category" error={visibleError(field.state.meta)}>
              <CategoryPicker
                type="expense"
                value={field.state.value}
                onChange={(id) => {
                  field.handleChange(id)
                  field.handleBlur()
                }}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="paymentMethodId">
          {(field) => (
            <FormField label="Paid with" error={visibleError(field.state.meta)}>
              <PaymentMethodPicker
                value={field.state.value}
                onChange={(id) => {
                  field.handleChange(id)
                  field.handleBlur()
                }}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="dueDay">
          {(field) => (
            <FormField
              id="rec-day"
              label="Due on day"
              hint="Day of the month. Shorter months use their last day."
              error={visibleError(field.state.meta)}
            >
              <Input
                id="rec-day"
                inputMode="numeric"
                className="w-28"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={!!visibleError(field.state.meta)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.kind}>
          {(kind) => (
            <div className="grid grid-cols-2 gap-3">
              <form.Field name="startMonth">
                {(field) => (
                  <FormField
                    id="rec-start"
                    label={kind === "emi" ? "First EMI" : "Starts"}
                    error={visibleError(field.state.meta)}
                  >
                    <Input
                      id="rec-start"
                      type="month"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </FormField>
                )}
              </form.Field>
              <form.Field name="endMonth">
                {(field) => (
                  <FormField
                    id="rec-end"
                    label={kind === "emi" ? "Last EMI" : "Ends"}
                    hint={kind === "emi" ? undefined : "Optional"}
                    error={visibleError(field.state.meta)}
                  >
                    <Input
                      id="rec-end"
                      type="month"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={!!visibleError(field.state.meta)}
                    />
                  </FormField>
                )}
              </form.Field>
            </div>
          )}
        </form.Subscribe>

        <form.Subscribe selector={(s) => s.values}>
          {(v) => <LoanSummary values={v} currency={currency} />}
        </form.Subscribe>

        <form.Field name="autoLog">
          {(field) => (
            <label className="flex items-center gap-3 rounded-xl border p-3.5">
              <div className="flex-1">
                <p className="text-sm font-medium">Log automatically</p>
                <p className="text-[13px] text-muted-foreground">
                  Adds the spend on its due day. Turn off to mark it paid yourself.
                </p>
              </div>
              <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
            </label>
          )}
        </form.Field>
      </div>

      <SheetFooter>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {item ? "Save changes" : "Add fixed expense"}
            </Button>
          )}
        </form.Subscribe>
        {item && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              await deleteRecurring(item.id)
              onDone()
            }}
          >
            <Trash2 /> Delete — keeps past entries
          </Button>
        )}
      </SheetFooter>
    </form>
  )
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** Live "36 EMIs · ₹5,40,000 total · ends Mar 2029" preview for loans. */
function LoanSummary({ values, currency }: { values: RecurringValues; currency: string }) {
  if (values.kind !== "emi" || !MONTH.test(values.startMonth) || !MONTH.test(values.endMonth)) return null
  if (values.endMonth < values.startMonth) return null
  const count = monthsInclusive(values.startMonth, values.endMonth)
  const amount = Number(values.amount.replace(",", "."))
  return (
    <p className="-mt-2 rounded-lg bg-secondary px-3 py-2.5 text-[13px] text-muted-foreground">
      <span className="font-medium text-foreground">{count} EMIs</span>
      {amount > 0 && <> · {formatMoney(amount * count, currency)} in total</>} · last one in{" "}
      {formatMonth(values.endMonth)}
    </p>
  )
}
