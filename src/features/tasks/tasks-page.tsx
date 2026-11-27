import { useForm } from "@tanstack/react-form"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { CalendarCheck, CheckCheck, Inbox, Sparkles } from "lucide-react"
import { useState } from "react"
import { z } from "zod"

import { EmptyState } from "@/components/empty-state"
import { Fab } from "@/components/fab"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db, type Task } from "@/lib/db"
import { addDays, formatDay, toDateKey } from "@/lib/dates"

import { compareTasks, quickAddTask, TASK_VIEWS, type TaskView } from "./data"
import { TaskForm } from "./task-form"
import { TaskItem, TaskList } from "./task-item"

export function TasksPage() {
  const { view = "today" } = useSearch({ from: "/tasks" })
  const navigate = useNavigate({ from: "/tasks" })
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const [sheet, setSheet] = useState<{ open: boolean; task?: Task }>({ open: false })
  const today = toDateKey()

  const open = (task?: Task) => setSheet({ open: true, task })
  const all = tasks ?? []
  const pending = all.filter((t) => !t.done).sort(compareTasks)

  const overdue = pending.filter((t) => t.dueDate && t.dueDate < today)
  const dueToday = pending.filter((t) => t.dueDate === today)
  const upcoming = pending.filter((t) => t.dueDate && t.dueDate > today)
  const anytime = pending.filter((t) => !t.dueDate)
  const done = all
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))

  const counts: Record<TaskView, number> = {
    today: overdue.length + dueToday.length,
    upcoming: upcoming.length,
    anytime: anytime.length,
    done: done.length,
  }

  const defaultDue =
    view === "today" ? today : view === "upcoming" ? addDays(today, 1) : ""

  return (
    <>
      <PageHeader title="Tasks" subtitle={`${pending.length} open`} />

      <Tabs
        value={view}
        onValueChange={(v) =>
          void navigate({ search: { view: v === "today" ? undefined : (v as TaskView) }, replace: true })
        }
      >
        <TabsList>
          {TASK_VIEWS.map((v) => (
            <TabsTrigger key={v} value={v} className="capitalize">
              {v}
              {counts[v] > 0 && v !== "done" && (
                <span className="text-xs text-muted-foreground tabular-nums">{counts[v]}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view !== "done" && <QuickAdd key={view} dueDate={defaultDue || null} />}

      {tasks === undefined ? null : view === "today" ? (
        overdue.length + dueToday.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nothing due today"
            description="Enjoy the space, or plan something for later."
          />
        ) : (
          <>
            {overdue.length > 0 && (
              <>
                <SectionTitle>Overdue</SectionTitle>
                <TaskList>
                  {overdue.map((t) => <TaskItem key={t.id} task={t} onOpen={open} />)}
                </TaskList>
              </>
            )}
            {dueToday.length > 0 && (
              <>
                <SectionTitle>Today</SectionTitle>
                <TaskList>
                  {dueToday.map((t) => (
                    <TaskItem key={t.id} task={t} onOpen={open} showDate={false} />
                  ))}
                </TaskList>
              </>
            )}
          </>
        )
      ) : view === "upcoming" ? (
        upcoming.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No upcoming tasks" description="Tasks with a future due date appear here." />
        ) : (
          groupByDay(upcoming).map(([day, items]) => (
            <section key={day}>
              <SectionTitle>{formatDay(day)}</SectionTitle>
              <TaskList>
                {items.map((t) => (
                  <TaskItem key={t.id} task={t} onOpen={open} showDate={false} />
                ))}
              </TaskList>
            </section>
          ))
        )
      ) : view === "anytime" ? (
        anytime.length === 0 ? (
          <EmptyState icon={Inbox} title="No undated tasks" description="Ideas and someday tasks without a due date live here." />
        ) : (
          <div className="mt-4">
            <TaskList>
              {anytime.map((t) => <TaskItem key={t.id} task={t} onOpen={open} />)}
            </TaskList>
          </div>
        )
      ) : done.length === 0 ? (
        <EmptyState icon={CheckCheck} title="Nothing completed yet" description="Completed tasks show up here." />
      ) : (
        <>
          <SectionTitle
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                onClick={() => void db.tasks.bulkDelete(done.map((t) => t.id))}
              >
                Clear all
              </Button>
            }
          >
            Completed
          </SectionTitle>
          <TaskList>
            {done.map((t) => <TaskItem key={t.id} task={t} onOpen={open} />)}
          </TaskList>
        </>
      )}

      <Fab label="New task" onClick={() => open()} />

      <Sheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))}>
        <SheetContent aria-describedby={undefined}>
          <TaskForm
            key={sheet.task?.id ?? "new"}
            task={sheet.task}
            defaultDueDate={defaultDue}
            onDone={() => setSheet((s) => ({ ...s, open: false }))}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

function groupByDay(tasks: Task[]): [string, Task[]][] {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    const key = t.dueDate ?? ""
    map.set(key, [...(map.get(key) ?? []), t])
  }
  return [...map.entries()]
}

const quickAddSchema = z.object({ title: z.string().trim().min(1).max(140) })

function QuickAdd({ dueDate }: { dueDate: string | null }) {
  const form = useForm({
    defaultValues: { title: "" },
    validators: { onSubmit: quickAddSchema },
    onSubmit: async ({ value, formApi }) => {
      await quickAddTask(value.title, dueDate)
      formApi.reset()
    },
  })
  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="title">
        {(field) => (
          <input
            aria-label="Quick add a task"
            placeholder={dueDate ? `Add a task for ${formatDay(dueDate).toLowerCase()}…` : "Add a task…"}
            enterKeyHint="done"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            className="h-12 w-full rounded-xl border border-dashed bg-transparent px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:border-solid focus:border-ring focus:bg-card"
          />
        )}
      </form.Field>
    </form>
  )
}
