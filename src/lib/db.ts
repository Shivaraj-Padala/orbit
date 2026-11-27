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
