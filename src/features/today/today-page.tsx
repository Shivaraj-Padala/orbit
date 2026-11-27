import { Link } from "@tanstack/react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { BellRing, ChevronRight, Settings, Sparkles } from "lucide-react"
import { useState, type ReactNode } from "react"

import { PageHeader } from "@/components/page-header"
import { Stat } from "@/components/stat"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { db, type Task } from "@/lib/db"
import { fromDateKey, greeting, toDateKey, toMonthKey } from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import {
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/reminders"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { GoalCard } from "@/features/goals/goal-card"
import { monthRange } from "@/features/money/data"
import { compareTasks } from "@/features/tasks/data"
import { TaskForm } from "@/features/tasks/task-form"
import { TaskItem, TaskList } from "@/features/tasks/task-item"
import { moodFor, upsertCheckIn } from "@/features/wellbeing/data"
import { MoodPicker } from "@/features/wellbeing/mood-picker"

export function TodayPage() {
  const { name, currency, monthlyBudget, waterGoal } = useSettings()
  const today = toDateKey()
  const [sheet, setSheet] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [permission, setPermission] = useState(() =>
    notificationsSupported() ? Notification.permission : "denied"
  )

  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const checkIn = useLiveQuery(() => db.checkins.where("date").equals(today).first(), [today])
  const spent = useLiveQuery(async () => {
    const [from, to] = monthRange(toMonthKey())
    const txs = await db.transactions.where("date").between(from, to, true, true).toArray()
    return txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  }, [])
  const goals = useLiveQuery(() => db.goals.toArray(), [])

  const due = (tasks ?? [])
    .filter((t) => !t.done && t.dueDate && t.dueDate <= today)
    .sort(compareTasks)
  const doneToday = (tasks ?? []).filter(
    (t) => t.done && t.completedAt && toDateKey(new Date(t.completedAt)) === today
  ).length
  const hasReminders = (tasks ?? []).some((t) => !t.done && t.remindAt && !t.reminded)
  const activeGoals = (goals ?? []).filter((g) => !g.completedAt).slice(0, 3)
  const mood = moodFor(checkIn?.mood ?? null)

  return (
    <>
      <PageHeader
        subtitle={fromDateKey(today).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting()}${name ? `, ${name}` : ""}`}
        action={
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link to="/settings">
              <Settings className="size-5" />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Due today" value={due.length} hint={`${doneToday} done`} />
        <Stat label="Spent" value={spent === undefined ? "—" : formatMoney(spent, currency, { compact: true })} hint="this month" />
        <Stat label="Water" value={`${checkIn?.water ?? 0}/${waterGoal}`} hint="glasses" />
      </div>

      {hasReminders && permission === "default" && (
        <Card className="mt-3 flex-row items-center gap-3 px-4">
          <BellRing className="size-5 shrink-0 text-brand" />
          <p className="flex-1 text-sm">Allow notifications so reminders can reach you.</p>
          <Button size="sm" onClick={async () => setPermission(await requestNotificationPermission())}>
            Allow
          </Button>
        </Card>
      )}

      <Section title="Tasks" to="/tasks">
        {due.length === 0 ? (
          <Card className="flex-row items-center gap-3 px-4">
            <Sparkles className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {tasks === undefined ? "" : doneToday > 0 ? "All done for today. Nice work." : "Nothing due today."}
            </p>
          </Card>
        ) : (
          <TaskList>
            {due.slice(0, 5).map((t) => (
              <TaskItem key={t.id} task={t} onOpen={(task) => setSheet({ open: true, task })} showDate={t.dueDate !== today} />
            ))}
          </TaskList>
        )}
      </Section>

      <Section title="Check-in" to="/wellbeing">
        <Card>
          {mood ? (
            <CardContent className="flex items-center gap-3">
              <mood.icon className="size-8" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="font-medium">Feeling {mood.label.toLowerCase()}</p>
                <p className="text-sm text-muted-foreground">Logged for today</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void upsertCheckIn(today, { mood: null })}>
                Change
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>How are you feeling?</CardTitle>
              </CardHeader>
              <CardContent>
                <MoodPicker value={null} onChange={(m) => void upsertCheckIn(today, { mood: m })} />
              </CardContent>
            </>
          )}
        </Card>
      </Section>

      <Section title="Budget" to="/money">
        <Link to="/money" className="block">
          <Card className="gap-3">
            <CardContent>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(spent ?? 0, currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {monthlyBudget ? `of ${formatMoney(monthlyBudget, currency)}` : "spent this month"}
                </p>
              </div>
              {monthlyBudget ? (
                <Progress
                  className="mt-3"
                  aria-label="Budget used"
                  value={((spent ?? 0) / monthlyBudget) * 100}
                  indicatorClassName={cn((spent ?? 0) > monthlyBudget ? "bg-destructive" : "bg-brand")}
                />
              ) : null}
            </CardContent>
          </Card>
        </Link>
      </Section>

      {activeGoals.length > 0 && (
        <Section title="Goals" to="/goals">
          <div className="grid gap-3">
            {activeGoals.map((g) => (
              <GoalCard key={g.id} goal={g} compact />
            ))}
          </div>
        </Section>
      )}

      <Sheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))}>
        <SheetContent aria-describedby={undefined}>
          <TaskForm
            key={sheet.task?.id ?? "new"}
            task={sheet.task}
            defaultDueDate={today}
            onDone={() => setSheet((s) => ({ ...s, open: false }))}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

function Section({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
        <Link to={to} className="-mr-1 inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          See all <ChevronRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  )
}
