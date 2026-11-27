import { z } from "zod"

import { db, newId, nowIso, type RecurringExpense, type Transaction } from "@/lib/db"
import { addMonths, daysBetween, toDateKey, toMonthKey } from "@/lib/dates"

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const normalize = (v: string) => v.trim().replace(",", ".")

export const recurringSchema = z
  .object({
    kind: z.enum(["bill", "emi"]),
    name: z.string().trim().min(1, "Give it a name").max(60, "Keep it under 60 characters"),
    amount: z
      .string()
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(normalize(v)), "Use a number like 1500 or 499.99")
      .refine((v) => Number(normalize(v)) > 0, "Amount must be more than zero"),
    category: z.string().min(1, "Pick a category"),
    paymentMethodId: z.string().min(1, "Choose how it's paid"),
    dueDay: z
      .string()
      .refine((v) => /^\d{1,2}$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= 31, "A day from 1 to 31"),
    startMonth: z.string().regex(MONTH, "Pick a month"),
    endMonth: z.string().refine((v) => v === "" || MONTH.test(v), "Pick a month"),
    autoLog: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "emi" && !v.endMonth) {
      ctx.addIssue({ code: "custom", path: ["endMonth"], message: "When is the last EMI?" })
    }
    if (v.endMonth && MONTH.test(v.startMonth) && v.endMonth < v.startMonth) {
      ctx.addIssue({ code: "custom", path: ["endMonth"], message: "Must be after the start month" })
    }
  })

export type RecurringValues = z.input<typeof recurringSchema>

export async function saveRecurring(values: RecurringValues, existing?: RecurringExpense) {
  const v = recurringSchema.parse(values)
  const fields = {
    kind: v.kind,
    name: v.name,
    amount: Math.round(Number(normalize(v.amount)) * 100) / 100,
    category: v.category,
    paymentMethodId: v.paymentMethodId,
    dueDay: Number(v.dueDay),
    startMonth: v.startMonth,
    endMonth: v.endMonth || null,
    autoLog: v.autoLog,
  }
  if (existing) await db.recurring.update(existing.id, fields)
  else
    await db.recurring.add({ ...fields, id: newId(), autoLoggedThrough: null, createdAt: nowIso() })
  await runAutoLog()
}

/** Removes the fixed expense; entries already logged stay in your history. */
export const deleteRecurring = (id: string) => db.recurring.delete(id)

/** Number of months from a to b inclusive (YYYY-MM). */
export function monthsInclusive(a: string, b: string) {
  const [ay, am] = a.split("-").map(Number)
  const [by, bm] = b.split("-").map(Number)
  return (by - ay) * 12 + (bm - am) + 1
}

export function isActiveIn(r: RecurringExpense, month: string) {
  return r.startMonth <= month && (!r.endMonth || month <= r.endMonth)
}

/** Due date (YYYY-MM-DD) in a month, clamped to the month's last day. */
export function dueDateIn(r: RecurringExpense, month: string) {
  const [y, m] = month.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${month}-${String(Math.min(r.dueDay, last)).padStart(2, "0")}`
}

export type DueStatus =
  | { state: "paid"; entry: Transaction }
  | { state: "overdue"; days: number }
  | { state: "due"; days: number }
  /** Fell due before you added it to Orbit — probably paid already */
  | { state: "unconfirmed" }

export function statusIn(
  r: RecurringExpense,
  month: string,
  entries: Transaction[],
  today = toDateKey()
): DueStatus {
  const entry = entries.find((t) => t.recurringId === r.id && t.period === month)
  if (entry) return { state: "paid", entry }
  const due = dueDateIn(r, month)
  const days = daysBetween(today, due)
  if (days >= 0) return { state: "due", days }
  if (due < toDateKey(new Date(r.createdAt))) return { state: "unconfirmed" }
  return { state: "overdue", days: -days }
}

/** Loan progress: EMIs paid so far (by schedule) out of the total. */
export function emiProgress(r: RecurringExpense, month = toMonthKey()) {
  const total = r.endMonth ? monthsInclusive(r.startMonth, r.endMonth) : 0
  const elapsed =
    month < r.startMonth ? 0 : Math.min(total, monthsInclusive(r.startMonth, month))
  // Count the current month only once its due date has passed.
  const current = month >= r.startMonth && (!r.endMonth || month <= r.endMonth)
  const paid = current && dueDateIn(r, month) > toDateKey() ? elapsed - 1 : elapsed
  const left = Math.max(0, total - paid)
  return { total, paid: Math.max(0, paid), left, remaining: left * r.amount }
}

export async function markPaid(r: RecurringExpense, month: string) {
  await db.transaction("rw", db.transactions, async () => {
    const exists = await db.transactions
      .where("recurringId")
      .equals(r.id)
      .filter((t) => t.period === month)
      .count()
    if (exists) return
    const due = dueDateIn(r, month)
    const today = toDateKey()
    await db.transactions.add({
      id: newId(),
      type: "expense",
      amount: r.amount,
      category: r.category,
      note: r.name,
      date: due > today ? today : due,
      paymentMethodId: r.paymentMethodId,
      recurringId: r.id,
      period: month,
      createdAt: nowIso(),
    })
  })
}

export async function unmarkPaid(entry: Transaction) {
  await db.transactions.delete(entry.id)
}

let running: Promise<void> | null = null

/**
 * Log fixed expenses whose due date has arrived. Only occurrences due on or
 * after the day the fixed expense was added are logged automatically —
 * anything earlier is left for you to mark as paid.
 */
export function runAutoLog(): Promise<void> {
  running ??= (async () => {
    try {
      const today = toDateKey()
      const thisMonth = toMonthKey()
      const items = await db.recurring.filter((r) => r.autoLog).toArray()
      for (const r of items) {
        const created = toDateKey(new Date(r.createdAt))
        const after = r.autoLoggedThrough ? addMonths(r.autoLoggedThrough, 1) : ""
        let month = [r.startMonth, created.slice(0, 7), after].sort().at(-1)!
        let handled = r.autoLoggedThrough
        while (month <= thisMonth && isActiveIn(r, month)) {
          const due = dueDateIn(r, month)
          if (due > today) break
          if (due >= created) await markPaid(r, month)
          handled = month
          month = addMonths(month, 1)
        }
        // Remember progress so a deleted entry is never re-created.
        if (handled !== r.autoLoggedThrough) {
          await db.recurring.update(r.id, { autoLoggedThrough: handled })
        }
      }
    } finally {
      running = null
    }
  })()
  return running
}

export function startAutoLog() {
  void runAutoLog()
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void runAutoLog()
  })
}
