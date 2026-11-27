import { z } from "zod"

import { db, newId, nowIso, type Priority, type Task } from "@/lib/db"
import { fromLocalInput, toDateKey } from "@/lib/dates"

export const TASK_VIEWS = ["today", "upcoming", "anytime", "done"] as const
export type TaskView = (typeof TASK_VIEWS)[number]

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your task a title")
    .max(140, "Keep it under 140 characters"),
  notes: z.string().max(1000, "Notes are too long"),
  dueDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a valid date"),
  remindAt: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Pick a valid time"),
  priority: z.enum(["low", "medium", "high"]),
})

export type TaskValues = z.input<typeof taskSchema>

export async function saveTask(values: TaskValues, existing?: Task) {
  const v = taskSchema.parse(values)
  const remindAt = fromLocalInput(v.remindAt)
  const dueDate = v.dueDate || (remindAt ? toDateKey(new Date(remindAt)) : null)
  const fields = {
    title: v.title,
    notes: v.notes.trim(),
    dueDate,
    remindAt,
    priority: v.priority,
  }
  if (existing) {
    await db.tasks.update(existing.id, {
      ...fields,
      // A changed reminder time should fire again.
      reminded: remindAt === existing.remindAt ? existing.reminded : false,
    })
  } else {
    await db.tasks.add({
      ...fields,
      id: newId(),
      reminded: false,
      done: false,
      completedAt: null,
      createdAt: nowIso(),
    })
  }
}

export async function quickAddTask(title: string, dueDate: string | null) {
  await db.tasks.add({
    id: newId(),
    title: title.trim(),
    notes: "",
    dueDate,
    remindAt: null,
    reminded: false,
    priority: "medium",
    done: false,
    completedAt: null,
    createdAt: nowIso(),
  })
}

export async function toggleTask(task: Task, done: boolean) {
  await db.tasks.update(task.id, {
    done,
    completedAt: done ? nowIso() : null,
  })
}

export const deleteTask = (id: string) => db.tasks.delete(id)

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

export function compareTasks(a: Task, b: Task) {
  return (
    (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    (a.remindAt ?? "z").localeCompare(b.remindAt ?? "z") ||
    a.createdAt.localeCompare(b.createdAt)
  )
}

export function isOverdue(task: Task, today = toDateKey()) {
  return !task.done && !!task.dueDate && task.dueDate < today
}
