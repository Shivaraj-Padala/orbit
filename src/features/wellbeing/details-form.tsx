import { useForm } from "@tanstack/react-form"

import { FormField } from "@/components/form-field"
import { visibleError } from "@/lib/form-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { CheckIn } from "@/lib/db"
import { formatDay } from "@/lib/dates"

import { detailsSchema, saveDetails, type DetailsValues } from "./data"

export function DetailsForm({
  date,
  checkIn,
  onDone,
}: {
  date: string
  checkIn?: CheckIn
  onDone: () => void
}) {
  const defaultValues: DetailsValues = {
    energy: checkIn?.energy ? (String(checkIn.energy) as DetailsValues["energy"]) : "",
    sleepHours: checkIn?.sleepHours != null ? String(checkIn.sleepHours) : "",
    exerciseMinutes: checkIn?.exerciseMinutes ? String(checkIn.exerciseMinutes) : "",
    note: checkIn?.note ?? "",
  }

  const form = useForm({
    defaultValues,
    validators: { onChange: detailsSchema, onSubmit: detailsSchema },
    onSubmit: async ({ value }) => {
      await saveDetails(date, value)
      onDone()
    },
  })

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
        <SheetTitle>{formatDay(date)}'s check-in</SheetTitle>
      </SheetHeader>

      <div className="grid gap-5 px-5">
        <form.Field name="energy">
          {(field) => (
            <FormField label="Energy" hint="1 is drained, 5 is buzzing">
              <ToggleGroup
                type="single"
                aria-label="Energy"
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as DetailsValues["energy"])}
              >
                {["1", "2", "3", "4", "5"].map((v) => (
                  <ToggleGroupItem key={v} value={v} className="tabular-nums">
                    {v}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FormField>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="sleepHours">
            {(field) => (
              <FormField id="wb-sleep" label="Sleep (hours)" error={visibleError(field.state.meta)}>
                <Input
                  id="wb-sleep"
                  inputMode="decimal"
                  placeholder="7.5"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={!!visibleError(field.state.meta)}
                />
              </FormField>
            )}
          </form.Field>
          <form.Field name="exerciseMinutes">
            {(field) => (
              <FormField id="wb-move" label="Movement (min)" error={visibleError(field.state.meta)}>
                <Input
                  id="wb-move"
                  inputMode="numeric"
                  placeholder="30"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={!!visibleError(field.state.meta)}
                />
              </FormField>
            )}
          </form.Field>
        </div>

        <form.Field name="note">
          {(field) => (
            <FormField id="wb-note" label="Journal" error={visibleError(field.state.meta)}>
              <Textarea
                id="wb-note"
                rows={4}
                placeholder="What's on your mind? What went well?"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </FormField>
          )}
        </form.Field>
      </div>

      <SheetFooter>
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" size="lg" disabled={!canSubmit || isSubmitting}>
              Save
            </Button>
          )}
        </form.Subscribe>
      </SheetFooter>
    </form>
  )
}
