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

import { CATEGORIES } from "./categories"
import {
  currencySymbol,
  deleteTransaction,
  saveTransaction,
  transactionSchema,
  type TransactionValues,
} from "./data"

export function TransactionForm({
  transaction,
  currency,
  onDone,
}: {
  transaction?: Transaction
  currency: string
  onDone: () => void
}) {
  const today = toDateKey()
  const defaultValues: TransactionValues = {
    type: transaction?.type ?? "expense",
    amount: transaction ? String(transaction.amount) : "",
    category: transaction?.category ?? "",
    note: transaction?.note ?? "",
    date: transaction?.date ?? today,
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

      <div className="grid gap-5 px-5">
        <form.Field
          name="type"
          listeners={{ onChange: () => form.setFieldValue("category", "") }}
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
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl font-medium text-muted-foreground">
                    {currencySymbol(currency)}
                  </span>
                  <Input
                    id="tx-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus={!transaction}
                    placeholder="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!!error}
                    className="h-16 text-3xl! font-semibold tracking-tight tabular-nums"
                    style={{ paddingLeft: `${Math.max(2.5, currencySymbol(currency).length * 0.9 + 1.5)}rem` }}
                  />
                </div>
              </FormField>
            )
          }}
        </form.Field>

        <form.Subscribe selector={(s) => s.values.type}>
          {(type) => (
            <form.Field name="category">
              {(field) => (
                <FormField label="Category" error={visibleError(field.state.meta)}>
                  <div role="radiogroup" aria-label="Category" className="grid grid-cols-4 gap-2">
                    {CATEGORIES[type].map(({ id, label, icon: Icon }) => {
                      const selected = field.state.value === id
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => {
                            field.handleChange(id)
                            field.handleBlur()
                          }}
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
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" size="lg" disabled={!canSubmit || isSubmitting}>
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
