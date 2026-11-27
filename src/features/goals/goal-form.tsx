import { useForm } from "@tanstack/react-form"
import type { ComponentProps } from "react"
import { Trash2 } from "lucide-react"

import { FormField } from "@/components/form-field"
import { visibleError } from "@/lib/form-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { Goal } from "@/lib/db"

import { deleteGoal, goalSchema, saveGoal, type GoalValues } from "./data"

export function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const defaultValues: GoalValues = {
    title: goal?.title ?? "",
    why: goal?.why ?? "",
    target: goal ? String(goal.target) : "",
    current: goal ? String(goal.current) : "",
    step: goal ? String(goal.step) : "1",
    unit: goal?.unit ?? "",
    deadline: goal?.deadline ?? "",
  }

  const form = useForm({
    defaultValues,
    validators: { onChange: goalSchema, onSubmit: goalSchema },
    onSubmit: async ({ value }) => {
      await saveGoal(value, goal)
      onDone()
    },
  })

  const text = (
    name: "title" | "why" | "target" | "current" | "step" | "unit" | "deadline",
    label: string,
    props: ComponentProps<typeof Input> = {},
    hint?: string
  ) => (
    <form.Field name={name}>
      {(field) => {
        const error = visibleError(field.state.meta)
        return (
          <FormField id={`goal-${name}`} label={label} error={error} hint={hint}>
            <Input
              id={`goal-${name}`}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={!!error}
              {...props}
            />
          </FormField>
        )
      }}
    </form.Field>
  )

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <SheetHeader>
        <SheetTitle>{goal ? "Edit goal" : "New goal"}</SheetTitle>
      </SheetHeader>

      <div className="grid gap-5 px-5">
        {text("title", "Goal", { placeholder: "Read 12 books", autoFocus: !goal })}

        <form.Field name="why">
          {(field) => (
            <FormField id="goal-why" label="Why it matters" error={visibleError(field.state.meta)}>
              <Textarea
                id="goal-why"
                rows={2}
                placeholder="A reason to come back to"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </FormField>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-3">
          {text("target", "Target", { inputMode: "decimal", placeholder: "12" })}
          {text("unit", "Unit", { placeholder: "books" })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {text("current", "Progress so far", { inputMode: "decimal", placeholder: "0" })}
          {text("step", "Each + adds", { inputMode: "decimal" })}
        </div>
        {text("deadline", "Target date", { type: "date" }, "Optional")}
      </div>

      <SheetFooter>
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" size="lg" disabled={!canSubmit || isSubmitting}>
              {goal ? "Save changes" : "Create goal"}
            </Button>
          )}
        </form.Subscribe>
        {goal && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              await deleteGoal(goal.id)
              onDone()
            }}
          >
            <Trash2 /> Delete goal
          </Button>
        )}
      </SheetFooter>
    </form>
  )
}
