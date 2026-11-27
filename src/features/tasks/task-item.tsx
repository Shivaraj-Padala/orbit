import { Bell, CalendarDays, Flag } from "lucide-react"
import type { ReactNode } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import type { Task } from "@/lib/db"
import { formatDay, formatTime, toDateKey } from "@/lib/dates"
import { cn } from "@/lib/utils"

import { isOverdue, toggleTask } from "./data"

export function TaskItem({
  task,
  onOpen,
  showDate = true,
}: {
  task: Task
  onOpen: (task: Task) => void
  showDate?: boolean
}) {
  const overdue = isOverdue(task)
  const remindSameDay =
    task.remindAt && task.dueDate === toDateKey(new Date(task.remindAt))

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Checkbox
        checked={task.done}
        onCheckedChange={(c) => void toggleTask(task, c === true)}
        aria-label={task.done ? `Mark “${task.title}” as not done` : `Complete “${task.title}”`}
        className="mt-0.5 size-[22px]"
      />
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="min-w-0 flex-1 text-left outline-none focus-visible:underline"
      >
        <p
          className={cn(
            "text-[15px] leading-snug break-words",
            task.done && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {(task.notes || (showDate && task.dueDate) || task.remindAt || task.priority === "high") && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {showDate && task.dueDate && (
              <span className={cn("inline-flex items-center gap-1", overdue && "text-destructive")}>
                <CalendarDays className="size-3.5" />
                {formatDay(task.dueDate)}
              </span>
            )}
            {task.remindAt && (
              <span className="inline-flex items-center gap-1">
                <Bell className="size-3.5" />
                {remindSameDay || !showDate ? formatTime(task.remindAt) : `${formatDay(toDateKey(new Date(task.remindAt)))} ${formatTime(task.remindAt)}`}
              </span>
            )}
            {task.priority === "high" && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <Flag className="size-3.5" />
                High
              </span>
            )}
            {task.notes && <span className="max-w-full truncate">{task.notes}</span>}
          </div>
        )}
      </button>
    </li>
  )
}

export function TaskList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">{children}</ul>
  )
}
