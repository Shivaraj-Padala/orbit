import { z } from "zod"

import { db, newId, nowIso, type Transaction } from "@/lib/db"

const normalize = (v: string) => v.trim().replace(",", ".")

export const transactionSchema = z
  .object({
  type: z.enum(["expense", "income"]),
  amount: z
    .string()
    .refine((v) => normalize(v) !== "", "Enter an amount")
    .refine((v) => normalize(v) === "" || /^\d+(\.\d{1,2})?$/.test(normalize(v)), "Use a number like 250 or 99.50")
    .refine((v) => normalize(v) === "" || Number(normalize(v)) > 0, "Amount must be more than zero")
    .refine((v) => Number(normalize(v)) < 1e12, "That amount is too large"),
  category: z.string().min(1, "Pick a category"),
  note: z.string().max(200, "Keep the note under 200 characters"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  paymentMethodId: z.string(),
})
  .superRefine((v, ctx) => {
    if (v.type === "expense" && !v.paymentMethodId) {
      ctx.addIssue({ code: "custom", path: ["paymentMethodId"], message: "Where did you pay from?" })
    }
  })

export type TransactionValues = z.input<typeof transactionSchema>

export async function saveTransaction(values: TransactionValues, existing?: Transaction) {
  const v = transactionSchema.parse(values)
  const fields = {
    type: v.type,
    amount: Math.round(Number(normalize(v.amount)) * 100) / 100,
    category: v.category,
    note: v.note.trim(),
    date: v.date,
    paymentMethodId: v.paymentMethodId || null,
  }
  if (existing) await db.transactions.update(existing.id, fields)
  else
    await db.transactions.add({
      ...fields,
      id: newId(),
      recurringId: null,
      period: null,
      createdAt: nowIso(),
    })
}

export const deleteTransaction = (id: string) => db.transactions.delete(id)

export function monthRange(month: string): [string, string] {
  return [`${month}-01`, `${month}-31`]
}

export function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat(undefined, { style: "currency", currency })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    )
  } catch {
    return currency
  }
}
