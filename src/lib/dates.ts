const pad = (n: number) => String(n).padStart(2, "0")

/** Local calendar day as YYYY-MM-DD */
export function toDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse a YYYY-MM-DD key as a local date (midnight). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** YYYY-MM month key */
export function toMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function addMonths(monthKey: string, months: number): string {
  const [y, m] = monthKey.split("-").map(Number)
  return toMonthKey(new Date(y, m - 1 + months, 1))
}

export function formatMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}

/** "Today", "Tomorrow", "Yesterday", or a short date. */
export function formatDay(key: string): string {
  const today = toDateKey()
  if (key === today) return "Today"
  if (key === addDays(today, 1)) return "Tomorrow"
  if (key === addDays(today, -1)) return "Yesterday"
  const d = fromDateKey(key)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatDateTime(iso: string): string {
  return `${formatDay(toDateKey(new Date(iso)))}, ${formatTime(iso)}`
}

/** ISO timestamp -> value for <input type="datetime-local"> */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value -> ISO timestamp */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round(
    (fromDateKey(toKey).getTime() - fromDateKey(fromKey).getTime()) / 86_400_000
  )
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 5) return "Good night"
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export function formatMonthShort(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })
}
