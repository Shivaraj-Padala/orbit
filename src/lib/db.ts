import Dexie, { type EntityTable } from "dexie"

export type Priority = "low" | "medium" | "high"

export interface Task {
  id: string
  title: string
  notes: string
  /** Local calendar day, YYYY-MM-DD */
  dueDate: string | null
  /** ISO timestamp */
  remindAt: string | null
  reminded: boolean
  priority: Priority
  done: boolean
  completedAt: string | null
  createdAt: string
}

export type TransactionType = "expense" | "income"

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  note: string
  /** Local calendar day, YYYY-MM-DD */
  date: string
  /** Card / UPI / cash etc. that was used */
  paymentMethodId: string | null
  /** Set when this entry was logged from a fixed expense */
  recurringId: string | null
  /** The month (YYYY-MM) a fixed-expense entry pays for */
  period: string | null
  createdAt: string
}

export type PaymentMethodType =
  | "credit_card"
  | "debit_card"
  | "upi"
  | "cash"
  | "bank"
  | "wallet"
  | "other"

export interface PaymentMethod {
  id: string
  /** A friendly name only — never card numbers */
  name: string
  type: PaymentMethodType
  /** Hidden from pickers but kept so past entries still show it */
  archived: boolean
  createdAt: string
}

export type RecurringKind = "bill" | "emi"

export interface RecurringExpense {
  id: string
  kind: RecurringKind
  name: string
  amount: number
  category: string
  paymentMethodId: string | null
  /** 1–31; clamped to the month's last day */
  dueDay: number
  /** First month it applies to, YYYY-MM */
  startMonth: string
  /** Last month it applies to (required for EMIs), YYYY-MM */
  endMonth: string | null
  /** Log an entry automatically when the due day arrives */
  autoLog: boolean
  /** Last month (YYYY-MM) auto-logging has handled; never revisited */
  autoLoggedThrough: string | null
  createdAt: string
}

export interface Goal {
  id: string
  title: string
  why: string
  target: number
  current: number
  /** How much one tap of "+" adds */
  step: number
  unit: string
  /** Local calendar day, YYYY-MM-DD */
  deadline: string | null
  createdAt: string
  completedAt: string | null
}

export interface CheckIn {
  id: string
  /** Local calendar day, YYYY-MM-DD — one check-in per day */
  date: string
  mood: number | null
  energy: number | null
  sleepHours: number | null
  water: number
  exerciseMinutes: number
  note: string
  updatedAt: string
}

export interface Settings {
  key: "app"
  name: string
  currency: string
  monthlyBudget: number | null
  waterGoal: number
}

const REGION_CURRENCY: Record<string, string> = {
  IN: "INR", US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", SG: "SGD",
  AE: "AED", JP: "JPY", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR",
  NL: "EUR", IE: "EUR",
}

function localeCurrency(): string {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    return (region && REGION_CURRENCY[region]) || "USD"
  } catch {
    return "USD"
  }
}

export const defaultSettings: Settings = {
  key: "app",
  name: "",
  currency: localeCurrency(),
  monthlyBudget: null,
  waterGoal: 8,
}

export const db = new Dexie("orbit") as Dexie & {
  tasks: EntityTable<Task, "id">
  transactions: EntityTable<Transaction, "id">
  goals: EntityTable<Goal, "id">
  checkins: EntityTable<CheckIn, "id">
  settings: EntityTable<Settings, "key">
  paymentMethods: EntityTable<PaymentMethod, "id">
  recurring: EntityTable<RecurringExpense, "id">
}

db.version(1).stores({
  tasks: "id, dueDate, remindAt, createdAt",
  transactions: "id, date, type, category",
  goals: "id, createdAt",
  checkins: "id, &date",
  settings: "key",
})

export const newId = () => crypto.randomUUID()
export const nowIso = () => new Date().toISOString()

const defaultPaymentMethods = (): PaymentMethod[] => {
  const t = Date.now()
  return [
    { id: newId(), name: "UPI", type: "upi", archived: false, createdAt: new Date(t).toISOString() },
    { id: newId(), name: "Cash", type: "cash", archived: false, createdAt: new Date(t + 1).toISOString() },
  ]
}

db.version(2)
  .stores({
    transactions: "id, date, type, category, paymentMethodId, recurringId",
    paymentMethods: "id, createdAt",
    recurring: "id, startMonth",
  })
  .upgrade(async (tx) => {
    await tx
      .table("transactions")
      .toCollection()
      .modify((t: Partial<Transaction>) => {
        t.paymentMethodId ??= null
        t.recurringId ??= null
        t.period ??= null
      })
    await tx.table("paymentMethods").bulkAdd(defaultPaymentMethods())
  })

/** Re-seed Cash and UPI when there are no payment methods at all. */
export async function ensureDefaultPaymentMethods() {
  if ((await db.paymentMethods.count()) === 0) {
    await db.paymentMethods.bulkAdd(defaultPaymentMethods())
  }
}

// Fresh installs skip upgrade functions, so seed here too.
db.on("populate", (tx) => {
  void tx.table("paymentMethods").bulkAdd(defaultPaymentMethods())
})
