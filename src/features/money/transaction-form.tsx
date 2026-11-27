import { useForm } from "@tanstack/react-form"
import { Trash2 } from "lucide-react"

import { FormField } from "@/components/form-field"
import { visibleError } from "@/lib/form-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Transaction, TransactionType } from "@/lib/db"
import { addDays, toDateKey } from "@/lib/dates"
import { cn } from "@/lib/utils"

import {
  deleteTransaction,
  saveTransaction,
  transactionSchema,
  type TransactionValues,
} from "./data"
import { AmountInput, CategoryPicker } from "./fields"
import { PaymentMethodPicker } from "./payment-method-picker"

export function TransactionForm({
  transaction,
  currency,
  defaultPaymentMethodId = "",
  onDone,
}: {
  transaction?: Transaction
  currency: string
  /** Pre-selects the method used most recently */
  defaultPaymentMethodId?: string
  onDone: () => void
}) {
  const today = toDateKey()
  const defaultValues: TransactionValues = {
    type: transaction?.type ?? "expense",
    amount: transaction ? String(transaction.amount) : "",
    category: transaction?.category ?? "",
    note: transaction?.note ?? "",
    date: transaction?.date ?? today,
    paymentMethodId: transaction ? (transaction.paymentMethodId ?? "") : defaultPaymentMethodId,
  }

  const form = useForm({
    defaultValues,
    validators: { onChange: transactionSchema, onSubmit: transactionSchema },
    onSubmit: async ({ value }) => {
      await saveTransaction(value, transaction)
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
        <SheetTitle>{transaction ? "Edit entry" : "New entry"}</SheetTitle>
      </SheetHeader>

      <div className="grid grid-cols-1 gap-5 px-5">
        <form.Field
          name="type"
          listeners={{
            onChange: ({ value }) => {
              form.setFieldValue("category", "")
              // The remembered method is for spending; income starts unset.
              form.setFieldValue("paymentMethodId", value === "expense" ? defaultPaymentMethodId : "")
            },
          }}
        >
          {(field) => (
            <ToggleGroup
              type="single"
              aria-label="Entry type"
              value={field.state.value}
              onValueChange={(v) => v && field.handleChange(v as TransactionType)}
            >
              <ToggleGroupItem value="expense">Expense</ToggleGroupItem>
              <ToggleGroupItem value="income">Income</ToggleGroupItem>
            </ToggleGroup>
          )}
        </form.Field>

        <form.Field name="amount">
          {(field) => {
            const error = visibleError(field.state.meta)
            return (
              <FormField id="tx-amount" label="Amount" error={error}>
                <AmountInput
                  id="tx-amount"
                  currency={currency}
                  autoFocus={!transaction}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={!!error}
                />
              </FormField>
            )
          }}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.type}>
          {(type) => (
            <>
              <form.Field name="category">
                {(field) => (
                  <FormField label="Category" error={visibleError(field.state.meta)}>
                    <CategoryPicker
                      type={type}
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
                  <FormField
                    label={type === "expense" ? "Paid with" : "Received in"}
                    hint={type === "income" ? "Optional" : undefined}
                    error={visibleError(field.state.meta)}
                  >
                    <PaymentMethodPicker
                      label={type === "expense" ? "Paid with" : "Received in"}
                      value={field.state.value}
                      onChange={(id) => {
                        field.handleChange(id)
                        field.handleBlur()
                      }}
                    />
                  </FormField>
                )}
              </form.Field>
            </>
          )}
        </form.Subscribe>

        <form.Field name="date">
          {(field) => (
            <FormField id="tx-date" label="Date" error={visibleError(field.state.meta)}>
              <div className="flex gap-2">
                {[
                  { label: "Today", value: today },
                  { label: "Yesterday", value: addDays(today, -1) },
                ].map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => field.handleChange(q.value)}
                    className={cn(
                      "h-11 shrink-0 rounded-md border px-3 text-[13px] font-medium transition-colors",
                      field.state.value === q.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {q.label}
                  </button>
                ))}
                <Input
                  id="tx-date"
                  type="date"
                  max={today}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            </FormField>
          )}
        </form.Field>

        <form.Field name="note">
          {(field) => (
            <FormField id="tx-note" label="Note" error={visibleError(field.state.meta)}>
              <Input
                id="tx-note"
                placeholder="What was it for?"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </FormField>
          )}
        </form.Field>
      </div>

      <SheetFooter>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {transaction ? "Save changes" : "Add entry"}
            </Button>
          )}
        </form.Subscribe>
        {transaction && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              await deleteTransaction(transaction.id)
              onDone()
            }}
          >
            <Trash2 /> Delete entry
          </Button>
        )}
      </SheetFooter>
    </form>
  )
}
