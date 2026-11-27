import { z } from "zod"

import { db } from "./db"

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const taskZ = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string(),
  dueDate: date.nullable(),
  remindAt: z.string().nullable(),
  reminded: z.boolean(),
  priority: z.enum(["low", "medium", "high"]),
  done: z.boolean(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
})

const transactionZ = z.object({
  id: z.string(),
  type: z.enum(["expense", "income"]),
  amount: z.number().nonnegative(),
  category: z.string(),
  note: z.string(),
  date,
  createdAt: z.string(),
})

const goalZ = z.object({
  id: z.string(),
  title: z.string(),
  why: z.string(),
  target: z.number().positive(),
  current: z.number().nonnegative(),
  step: z.number().positive(),
  unit: z.string(),
  deadline: date.nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
})

const checkInZ = z.object({
  id: z.string(),
  date,
  mood: z.number().min(1).max(5).nullable(),
  energy: z.number().min(1).max(5).nullable(),
  sleepHours: z.number().min(0).max(24).nullable(),
  water: z.number().int().nonnegative(),
  exerciseMinutes: z.number().nonnegative(),
  note: z.string(),
  updatedAt: z.string(),
})

const settingsZ = z.object({
  key: z.literal("app"),
  name: z.string(),
  currency: z.string().length(3),
  monthlyBudget: z.number().positive().nullable(),
  waterGoal: z.number().int().positive(),
})

const backupSchema = z.object({
  app: z.literal("orbit"),
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    tasks: z.array(taskZ),
    transactions: z.array(transactionZ),
    goals: z.array(goalZ),
    checkins: z.array(checkInZ),
    settings: z.array(settingsZ),
  }),
})

export async function exportBackup() {
  const backup: z.infer<typeof backupSchema> = {
    app: "orbit",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: await db.tasks.toArray(),
      transactions: await db.transactions.toArray(),
      goals: await db.goals.toArray(),
      checkins: await db.checkins.toArray(),
      settings: await db.settings.toArray(),
    },
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `orbit-backup-${backup.exportedAt.slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Validate a backup file and replace all data with it. Throws on invalid input. */
export async function importBackup(file: File) {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  const parsed = backupSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error("That file doesn't look like an Orbit backup.")
  }
  const { data } = parsed.data
  await db.transaction("rw", [db.tasks, db.transactions, db.goals, db.checkins, db.settings], async () => {
    await Promise.all([db.tasks.clear(), db.transactions.clear(), db.goals.clear(), db.checkins.clear(), db.settings.clear()])
    await Promise.all([
      db.tasks.bulkAdd(data.tasks),
      db.transactions.bulkAdd(data.transactions),
      db.goals.bulkAdd(data.goals),
      db.checkins.bulkAdd(data.checkins),
      db.settings.bulkAdd(data.settings),
    ])
  })
  return data
}

export async function eraseAll() {
  await db.transaction("rw", [db.tasks, db.transactions, db.goals, db.checkins, db.settings], async () => {
    await Promise.all([db.tasks.clear(), db.transactions.clear(), db.goals.clear(), db.checkins.clear(), db.settings.clear()])
  })
}
