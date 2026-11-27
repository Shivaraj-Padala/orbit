import { useForm } from "@tanstack/react-form"
import { BellRing, Trash2 } from "lucide-react"
import { useState } from "react"

import { FormField } from "@/components/form-field"
import { visibleError } from "@/lib/form-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Priority, Task } from "@/lib/db"
import { addDays, toDateKey, toLocalInput } from "@/lib/dates"
import {
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/reminders"
import { cn } from "@/lib/utils"

import { deleteTask, saveTask, taskSchema, type TaskValues } from "./data"

export function TaskForm({
  task,
  defaultDueDate = "",
  onDone,
}: {
  task?: Task
  defaultDueDate?: string
  onDone: () => void
}) {
  const [permission, setPermission] = useState(() =>
    notificationsSupported() ? Notification.permission : "denied"
  )

  const defaultValues: TaskValues = {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    dueDate: task?.dueDate ?? defaultDueDate,
    remindAt: toLocalInput(task?.remindAt ?? null),
    priority: task?.priority ?? "medium",
  }

  const form = useForm({
    defaultValues,
    validators: { onChange: taskSchema, onSubmit: taskSchema },
    onSubmit: async ({ value }) => {
      await saveTask(value, task)
      onDone()
    },
  })

  const today = toDateKey()
  const quickDates = [
    { label: "Today", value: today },
    { label: "Tomorrow", value: addDays(today, 1) },
    { label: "Next week", value: addDays(today, 7) },
    { label: "No date", value: "" },
  ]

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
        <SheetTitle>{task ? "Edit task" : "New task"}</SheetTitle>
      </SheetHeader>

      <div className="grid grid-cols-1 gap-5 px-5">
        <form.Field name="title">
          {(field) => (
            <FormField id="task-title" label="Title" error={visibleError(field.state.meta)}>
              <Input
                id="task-title"
                autoFocus={!task}
                placeholder="What needs doing?"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={!!visibleError(field.state.meta)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <FormField id="task-notes" label="Notes" error={visibleError(field.state.meta)}>
              <Textarea
                id="task-notes"
                placeholder="Optional details"
                rows={2}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="dueDate">
          {(field) => (
            <FormField id="task-due" label="Due" error={visibleError(field.state.meta)}>
              <div className="flex flex-wrap gap-2">
                {quickDates.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => field.handleChange(q.value)}
                    className={cn(
                      "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
                      field.state.value === q.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <Input
                id="task-due"
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="remindAt">
          {(field) => (
            <FormField
              id="task-remind"
              label="Reminder"
              error={visibleError(field.state.meta)}
              hint={
                field.state.value && permission === "default" ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
                    onClick={async () => setPermission(await requestNotificationPermission())}
                  >
                    <BellRing className="size-3.5" /> Allow notifications for reminders
                  </button>
                ) : field.state.value && permission === "denied" ? (
                  "Notifications are blocked — reminders will show inside Orbit."
                ) : undefined
              }
            >
              <div className="flex gap-2">
                <Input
                  id="task-remind"
                  type="datetime-local"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.value && (
                  <Button type="button" variant="ghost" className="h-11" onClick={() => field.handleChange("")}>
                    Clear
                  </Button>
                )}
              </div>
            </FormField>
          )}
        </form.Field>

        <form.Field name="priority">
          {(field) => (
            <FormField label="Priority">
              <ToggleGroup
                type="single"
                value={field.state.value}
                onValueChange={(v) => v && field.handleChange(v as Priority)}
                aria-label="Priority"
              >
                <ToggleGroupItem value="low">Low</ToggleGroupItem>
                <ToggleGroupItem value="medium">Medium</ToggleGroupItem>
                <ToggleGroupItem value="high">High</ToggleGroupItem>
              </ToggleGroup>
            </FormField>
          )}
        </form.Field>
      </div>

      <SheetFooter>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {task ? "Save changes" : "Add task"}
            </Button>
          )}
        </form.Subscribe>
        {task && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              await deleteTask(task.id)
              onDone()
            }}
          >
            <Trash2 /> Delete task
          </Button>
        )}
      </SheetFooter>
    </form>
  )
}
