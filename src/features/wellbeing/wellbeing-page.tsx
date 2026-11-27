import { useLiveQuery } from "dexie-react-hooks"
import { Droplet, Minus, Moon, NotebookPen, Plus, Footprints, Zap } from "lucide-react"
import { useState, type ReactNode } from "react"

import { PageHeader, SectionTitle } from "@/components/page-header"
import { Stat } from "@/components/stat"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { db } from "@/lib/db"
import { addDays, formatDay, fromDateKey, toDateKey } from "@/lib/dates"
import { formatNumber } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

import { average, moodFor, upsertCheckIn } from "./data"
import { DetailsForm } from "./details-form"
import { MoodPicker } from "./mood-picker"

export function WellbeingPage() {
  const today = toDateKey()
  const { waterGoal } = useSettings()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const weekStart = addDays(today, -6)

  const recent = useLiveQuery(
    () => db.checkins.where("date").between(addDays(today, -60), today, true, true).reverse().sortBy("date"),
    [today]
  )
  const checkIn = recent?.find((c) => c.date === today)
  const week = (recent ?? []).filter((c) => c.date >= weekStart)
  const journal = (recent ?? []).filter((c) => c.note).slice(0, 10)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const avgMood = average(week.map((c) => c.mood))
  const avgSleep = average(week.map((c) => c.sleepHours))
  const activeMinutes = week.reduce((s, c) => s + c.exerciseMinutes, 0)
  const water = checkIn?.water ?? 0

  return (
    <>
      <PageHeader title="Wellbeing" subtitle={fromDateKey(today).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} />

      <Card>
        <CardHeader>
          <CardTitle>How are you feeling?</CardTitle>
        </CardHeader>
        <CardContent>
          <MoodPicker value={checkIn?.mood ?? null} onChange={(mood) => void upsertCheckIn(today, { mood })} />
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardHeader className="items-center">
          <CardTitle className="flex items-center gap-2">
            <Droplet className="size-4 text-muted-foreground" /> Water
          </CardTitle>
          <span className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{water}</span> / {waterGoal} glasses
          </span>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label="Remove a glass"
            disabled={water <= 0}
            onClick={() => void upsertCheckIn(today, { water: Math.max(0, water - 1) })}
          >
            <Minus />
          </Button>
          <div className="flex flex-1 justify-center gap-1" aria-hidden>
            {Array.from({ length: Math.max(waterGoal, water) }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-7 max-w-4 flex-1 rounded-full transition-colors",
                  i < water ? "bg-brand" : "bg-secondary"
                )}
              />
            ))}
          </div>
          <Button
            size="icon"
            className="rounded-full"
            aria-label="Add a glass"
            onClick={() => void upsertCheckIn(today, { water: water + 1 })}
          >
            <Plus />
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-3 gap-0 py-0">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="grid w-full grid-cols-3 divide-x py-4 text-left"
        >
          <Metric icon={<Moon />} label="Sleep" value={checkIn?.sleepHours != null ? `${formatNumber(checkIn.sleepHours)}h` : "—"} />
          <Metric icon={<Zap />} label="Energy" value={checkIn?.energy ? `${checkIn.energy}/5` : "—"} />
          <Metric icon={<Footprints />} label="Movement" value={checkIn?.exerciseMinutes ? `${checkIn.exerciseMinutes}m` : "—"} />
        </button>
        <div className="border-t px-4 py-3">
          <Button variant="secondary" className="w-full" onClick={() => setDetailsOpen(true)}>
            <NotebookPen /> {checkIn?.note || checkIn?.sleepHours != null ? "Edit today's log" : "Log sleep, energy & journal"}
          </Button>
        </div>
      </Card>

      <SectionTitle>Last 7 days</SectionTitle>
      <Card className="py-4">
        <CardContent>
          <ol className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const c = week.find((w) => w.date === d)
              const mood = moodFor(c?.mood ?? null)
              return (
                <li key={d} className="flex flex-col items-center gap-1.5">
                  <span className={cn("text-[11px] font-medium text-muted-foreground", d === today && "text-foreground")}>
                    {fromDateKey(d).toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full",
                      d === today ? "bg-secondary" : ""
                    )}
                    title={mood ? `${formatDay(d)}: ${mood.label}` : `${formatDay(d)}: no check-in`}
                  >
                    {mood ? (
                      <mood.icon className="size-5" strokeWidth={1.75} aria-label={mood.label} />
                    ) : (
                      <span className="size-1.5 rounded-full bg-muted-foreground/30" aria-label="No check-in" />
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Avg mood" value={avgMood ? moodFor(avgMood)?.label : "—"} hint={avgMood ? `${formatNumber(Math.round(avgMood * 10) / 10)} / 5` : "No data"} />
        <Stat label="Avg sleep" value={avgSleep ? `${formatNumber(Math.round(avgSleep * 10) / 10)}h` : "—"} hint="per night" />
        <Stat label="Movement" value={`${activeMinutes}m`} hint="this week" />
      </div>

      {journal.length > 0 && (
        <>
          <SectionTitle>Journal</SectionTitle>
          <ul className="grid gap-3">
            {journal.map((c) => {
              const mood = moodFor(c.mood)
              return (
                <li key={c.id} className="rounded-xl border bg-card p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    {mood && <mood.icon className="size-4" />}
                    {formatDay(c.date)}
                    {mood && <span>· {mood.label}</span>}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.note}</p>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent aria-describedby={undefined}>
          <DetailsForm date={today} checkIn={checkIn} onDone={() => setDetailsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
