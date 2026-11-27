import { useLiveQuery } from "dexie-react-hooks"
import { Target } from "lucide-react"
import { useState } from "react"

import { EmptyState } from "@/components/empty-state"
import { Fab } from "@/components/fab"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { db, type Goal } from "@/lib/db"

import { GoalCard } from "./goal-card"
import { GoalForm } from "./goal-form"

export function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray(), [])
  const [sheet, setSheet] = useState<{ open: boolean; goal?: Goal }>({ open: false })
  const open = (goal?: Goal) => setSheet({ open: true, goal })

  const active = (goals ?? [])
    .filter((g) => !g.completedAt)
    .sort(
      (a, b) =>
        (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") ||
        a.createdAt.localeCompare(b.createdAt)
    )
  const completed = (goals ?? [])
    .filter((g) => g.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle={goals ? `${active.length} in progress` : undefined}
      />

      {goals !== undefined && goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Set your first goal"
          description="Something to work towards — books to read, money to save, kilometres to run."
          action={<Button onClick={() => open()}>Create a goal</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={open} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <>
          <SectionTitle>Achieved</SectionTitle>
          <div className="grid gap-3">
            {completed.map((g) => (
              <GoalCard key={g.id} goal={g} onOpen={open} />
            ))}
          </div>
        </>
      )}

      <Fab label="New goal" onClick={() => open()} />

      <Sheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))}>
        <SheetContent aria-describedby={undefined}>
          <GoalForm
            key={sheet.goal?.id ?? "new"}
            goal={sheet.goal}
            onDone={() => setSheet((s) => ({ ...s, open: false }))}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
