import { CircleCheck, Minus, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { Goal } from "@/lib/db"
import { daysBetween, formatDay, toDateKey } from "@/lib/dates"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { adjustGoal, goalProgress } from "./data"

export function GoalCard({
  goal,
  onOpen,
  compact = false,
}: {
  goal: Goal
  onOpen?: (goal: Goal) => void
  compact?: boolean
}) {
  const pct = goalProgress(goal)
  const done = !!goal.completedAt

  return (
    <div className="rounded-xl border bg-card p-4">
      <button
        type="button"
        className="block w-full text-left outline-none focus-visible:underline"
        onClick={() => onOpen?.(goal)}
        disabled={!onOpen}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-[15px] leading-snug font-semibold break-words">{goal.title}</p>
          <DeadlineBadge goal={goal} />
        </div>
        {!compact && goal.why && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{goal.why}</p>
        )}
      </button>

      <Progress
        value={pct}
        className="mt-3.5"
        aria-label={`${goal.title} progress`}
        indicatorClassName={cn(done ? "bg-success" : "bg-brand")}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm tabular-nums">
          <span className="font-semibold">{formatNumber(goal.current)}</span>
          <span className="text-muted-foreground">
            {" "}/ {formatNumber(goal.target)} {goal.unit}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">{Math.floor(pct)}%</span>
        </p>
        {!compact && (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              aria-label={`Subtract ${formatNumber(goal.step)}`}
              disabled={goal.current <= 0}
              onClick={() => void adjustGoal(goal, -goal.step)}
            >
              <Minus />
            </Button>
            <Button
              size="icon-sm"
              className="rounded-full"
              aria-label={`Add ${formatNumber(goal.step)}`}
              onClick={() => void adjustGoal(goal, goal.step)}
            >
              <Plus />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function DeadlineBadge({ goal }: { goal: Goal }) {
  if (goal.completedAt) {
    return (
      <Badge variant="secondary" className="text-success">
        <CircleCheck /> Done
      </Badge>
    )
  }
  if (!goal.deadline) return null
  const days = daysBetween(toDateKey(), goal.deadline)
  if (days < 0) return <Badge variant="destructive">Overdue</Badge>
  return (
    <Badge variant="secondary">
      {days === 0 ? "Due today" : days <= 30 ? `${days}d left` : formatDay(goal.deadline)}
    </Badge>
  )
}
