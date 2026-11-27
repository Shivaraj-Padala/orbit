import { Annoyed, Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react"
import { z } from "zod"

import { db, newId, nowIso, type CheckIn } from "@/lib/db"

export const MOODS: { value: number; label: string; icon: LucideIcon }[] = [
  { value: 1, label: "Rough", icon: Frown },
  { value: 2, label: "Low", icon: Annoyed },
  { value: 3, label: "Okay", icon: Meh },
  { value: 4, label: "Good", icon: Smile },
  { value: 5, label: "Great", icon: Laugh },
]

export const moodFor = (value: number | null) =>
  MOODS.find((m) => m.value === Math.round(value ?? 0))

export async function upsertCheckIn(
  date: string,
  patch: Partial<Omit<CheckIn, "id" | "date" | "updatedAt">>
) {
  await db.transaction("rw", db.checkins, async () => {
    const existing = await db.checkins.where("date").equals(date).first()
    if (existing) {
      await db.checkins.update(existing.id, { ...patch, updatedAt: nowIso() })
    } else {
      await db.checkins.add({
        id: newId(),
        date,
        mood: null,
        energy: null,
        sleepHours: null,
        water: 0,
        exerciseMinutes: 0,
        note: "",
        ...patch,
        updatedAt: nowIso(),
      })
    }
  })
}

const decimal = (v: string) => Number(v.trim().replace(",", "."))

export const detailsSchema = z.object({
  energy: z.enum(["", "1", "2", "3", "4", "5"]),
  sleepHours: z
    .string()
    .refine(
      (v) => v.trim() === "" || (/^\d+([.,]\d+)?$/.test(v.trim()) && decimal(v) <= 24),
      "Enter hours between 0 and 24"
    ),
  exerciseMinutes: z
    .string()
    .refine(
      (v) => v.trim() === "" || (/^\d+$/.test(v.trim()) && Number(v) <= 1440),
      "Enter whole minutes"
    ),
  note: z.string().max(1000, "Keep it under 1000 characters"),
})

export type DetailsValues = z.input<typeof detailsSchema>

export async function saveDetails(date: string, values: DetailsValues) {
  const v = detailsSchema.parse(values)
  await upsertCheckIn(date, {
    energy: v.energy ? Number(v.energy) : null,
    sleepHours: v.sleepHours.trim() ? decimal(v.sleepHours) : null,
    exerciseMinutes: v.exerciseMinutes.trim() ? Number(v.exerciseMinutes) : 0,
    note: v.note.trim(),
  })
}

export function average(values: (number | null)[]) {
  const nums = values.filter((v): v is number => v !== null)
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}
