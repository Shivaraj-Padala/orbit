import { z } from "zod"

import { db, newId, nowIso, type Goal } from "@/lib/db"

const num = (v: string) => Number(v.trim().replace(",", "."))
const isNum = (v: string) => /^\d+(\.\d+)?$/.test(v.trim().replace(",", "."))

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Name your goal").max(100, "Keep it under 100 characters"),
  why: z.string().max(300, "Keep it under 300 characters"),
  target: z
    .string()
    .refine(isNum, "Enter a number")
    .refine((v) => !isNum(v) || num(v) > 0, "Target must be more than zero"),
  current: z.string().refine((v) => v.trim() === "" || isNum(v), "Enter a number"),
  step: z
    .string()
    .refine(isNum, "Enter a number")
    .refine((v) => !isNum(v) || num(v) > 0, "Must be more than zero"),
  unit: z.string().trim().max(24, "Keep the unit short"),
  deadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a valid date"),
})

export type GoalValues = z.input<typeof goalSchema>

export async function saveGoal(values: GoalValues, existing?: Goal) {
  const v = goalSchema.parse(values)
  const target = num(v.target)
  const current = v.current.trim() === "" ? 0 : num(v.current)
  const fields = {
    title: v.title,
    why: v.why.trim(),
    target,
    current,
    step: num(v.step),
    unit: v.unit,
    deadline: v.deadline || null,
  }
  const completedAt =
    current >= target ? (existing?.completedAt ?? nowIso()) : null
  if (existing) await db.goals.update(existing.id, { ...fields, completedAt })
  else await db.goals.add({ ...fields, id: newId(), createdAt: nowIso(), completedAt })
}

export async function adjustGoal(goal: Goal, delta: number) {
  const current = Math.max(0, Math.round((goal.current + delta) * 1000) / 1000)
  await db.goals.update(goal.id, {
    current,
    completedAt: current >= goal.target ? (goal.completedAt ?? nowIso()) : null,
  })
}

export const deleteGoal = (id: string) => db.goals.delete(id)

export function goalProgress(goal: Goal) {
  return Math.min(100, (goal.current / goal.target) * 100)
}
