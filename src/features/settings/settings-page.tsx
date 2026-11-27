import { useForm } from "@tanstack/react-form"
import { Link } from "@tanstack/react-router"
import {
  Bell,
  ChevronLeft,
  Download,
  Monitor,
  Moon,
  Smartphone,
  Sun,
  Trash2,
  Upload,
} from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import { z } from "zod"

import { FormField } from "@/components/form-field"
import { visibleError } from "@/lib/form-errors"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { eraseAll, exportBackup, importBackup } from "@/lib/backup"
import type { Settings } from "@/lib/db"
import { CURRENCIES } from "@/lib/format"
import { isIos, isStandalone, promptInstall, useInstallPrompt } from "@/lib/install"
import {
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/reminders"
import { updateSettings, useSettings } from "@/lib/settings"
import { useTheme, type Theme } from "@/lib/theme"

export function SettingsPage() {
  const settings = useSettings()
  const { theme, setTheme } = useTheme()

  return (
    <>
      <div className="-ml-2 pt-2">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to="/">
            <ChevronLeft /> Today
          </Link>
        </Button>
      </div>
      <PageHeader title="Settings" />

      <SectionTitle>Appearance</SectionTitle>
      <ToggleGroup
        type="single"
        aria-label="Theme"
        value={theme}
        onValueChange={(v) => v && setTheme(v as Theme)}
        className="h-12"
      >
        <ToggleGroupItem value="light" className="h-10">
          <Sun /> Light
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" className="h-10">
          <Moon /> Dark
        </ToggleGroupItem>
        <ToggleGroupItem value="system" className="h-10">
          <Monitor /> Auto
        </ToggleGroupItem>
      </ToggleGroup>

      <SectionTitle>Preferences</SectionTitle>
      {/* Re-mount once stored settings load so the form starts from them. */}
      <PreferencesForm key={settings.loaded ? "ready" : "loading"} settings={settings} />

      <SectionTitle>App</SectionTitle>
      <Card className="gap-0 py-0">
        <NotificationsRow />
        <InstallRow />
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <DataCard />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Orbit keeps everything on this device. Nothing is sent anywhere.
      </p>
    </>
  )
}

const preferencesSchema = z.object({
  name: z.string().trim().max(40, "Keep it under 40 characters"),
  currency: z.string().length(3),
  monthlyBudget: z
    .string()
    .refine(
      (v) => v.trim() === "" || (/^\d+([.,]\d{1,2})?$/.test(v.trim()) && Number(v.replace(",", ".")) > 0),
      "Enter an amount, or leave empty"
    ),
  waterGoal: z
    .string()
    .refine((v) => /^\d+$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= 30, "Between 1 and 30"),
})

function PreferencesForm({ settings }: { settings: Settings }) {
  const initial = {
    name: settings.name,
    currency: settings.currency,
    monthlyBudget: settings.monthlyBudget ? String(settings.monthlyBudget) : "",
    waterGoal: String(settings.waterGoal),
  }
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial))
  const [savedOnce, setSavedOnce] = useState(false)
  const form = useForm({
    defaultValues: initial,
    validators: { onChange: preferencesSchema, onSubmit: preferencesSchema },
    onSubmit: async ({ value }) => {
      const v = preferencesSchema.parse(value)
      await updateSettings({
        name: v.name,
        currency: v.currency,
        monthlyBudget: v.monthlyBudget.trim() ? Number(v.monthlyBudget.replace(",", ".")) : null,
        waterGoal: Number(v.waterGoal),
      })
      setSavedSnapshot(JSON.stringify(value))
      setSavedOnce(true)
    },
  })

  const currencies = CURRENCIES.includes(settings.currency as (typeof CURRENCIES)[number])
    ? CURRENCIES
    : [settings.currency, ...CURRENCIES]

  return (
    <Card>
      <CardContent>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.Field name="name">
            {(field) => (
              <FormField id="pref-name" label="Your name" hint="Used in the greeting" error={visibleError(field.state.meta)}>
                <Input
                  id="pref-name"
                  autoComplete="given-name"
                  placeholder="Optional"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </FormField>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="currency">
              {(field) => (
                <FormField id="pref-currency" label="Currency">
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger id="pref-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>

            <form.Field name="waterGoal">
              {(field) => (
                <FormField id="pref-water" label="Water goal" error={visibleError(field.state.meta)}>
                  <Input
                    id="pref-water"
                    inputMode="numeric"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!!visibleError(field.state.meta)}
                  />
                </FormField>
              )}
            </form.Field>
          </div>

          <form.Field name="monthlyBudget">
            {(field) => (
              <FormField
                id="pref-budget"
                label="Monthly budget"
                hint="Spending limit for each month"
                error={visibleError(field.state.meta)}
              >
                <Input
                  id="pref-budget"
                  inputMode="decimal"
                  placeholder="No budget"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={!!visibleError(field.state.meta)}
                />
              </FormField>
            )}
          </form.Field>

          <form.Subscribe
            selector={(s) => [s.canSubmit, s.isSubmitting, JSON.stringify(s.values) === savedSnapshot] as const}
          >
            {([canSubmit, isSubmitting, unchanged]) => (
              <Button type="submit" variant={unchanged ? "secondary" : "default"} disabled={!canSubmit || isSubmitting || unchanged}>
                {unchanged && savedOnce ? "Saved" : "Save preferences"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  )
}

function Row({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground [&_svg]:size-[18px]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function NotificationsRow() {
  const [permission, setPermission] = useState(() =>
    notificationsSupported() ? Notification.permission : null
  )
  return (
    <Row
      icon={<Bell />}
      title="Reminders"
      description={
        permission === null
          ? "Notifications aren't supported in this browser"
          : permission === "granted"
            ? "Notifications are on"
            : permission === "denied"
              ? "Blocked — allow notifications in your browser settings"
              : "Get notified when a task reminder is due"
      }
      action={
        permission === "default" && (
          <Button size="sm" onClick={async () => setPermission(await requestNotificationPermission())}>
            Allow
          </Button>
        )
      }
    />
  )
}

function InstallRow() {
  const canPrompt = useInstallPrompt()
  const standalone = isStandalone()
  return (
    <Row
      icon={<Smartphone />}
      title="Install Orbit"
      description={
        standalone
          ? "Installed on this device"
          : canPrompt
            ? "Add Orbit to your home screen"
            : isIos()
              ? "In Safari, tap Share, then “Add to Home Screen”"
              : "Use your browser menu to install or add to home screen"
      }
      action={
        !standalone &&
        canPrompt && (
          <Button size="sm" onClick={() => void promptInstall()}>
            Install
          </Button>
        )
      }
    />
  )
}

function DataCard() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [confirmErase, setConfirmErase] = useState(false)

  return (
    <>
      <Card className="gap-0 py-0">
        <Row
          icon={<Download />}
          title="Export backup"
          description="Download all your data as a file"
          action={
            <Button size="sm" variant="outline" onClick={() => void exportBackup()}>
              Export
            </Button>
          }
        />
        <Row
          icon={<Upload />}
          title="Restore backup"
          description="Replaces everything on this device"
          action={
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              Import
            </Button>
          }
        />
        <Row
          icon={<Trash2 />}
          title="Erase all data"
          description="Start fresh — this can't be undone"
          action={
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmErase(true)}>
              Erase
            </Button>
          }
        />
      </Card>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (!file) return
          try {
            const data = await importBackup(file)
            setMessage({
              tone: "ok",
              text: `Restored ${data.tasks.length} tasks, ${data.transactions.length} entries, ${data.goals.length} goals and ${data.checkins.length} check-ins.`,
            })
          } catch (err) {
            setMessage({ tone: "error", text: err instanceof Error ? err.message : "Import failed." })
          }
        }}
      />
      {message && (
        <p
          role="status"
          className={message.tone === "error" ? "mt-2 px-1 text-sm text-destructive" : "mt-2 px-1 text-sm text-muted-foreground"}
        >
          {message.text}
        </p>
      )}

      <Sheet open={confirmErase} onOpenChange={setConfirmErase}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Erase all data?</SheetTitle>
            <SheetDescription>
              Every task, entry, goal and check-in on this device will be deleted. Export a backup first if you might want it back.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="pt-4">
            <Button
              size="lg"
              variant="destructive"
              onClick={async () => {
                await eraseAll()
                setConfirmErase(false)
                setMessage({ tone: "ok", text: "All data erased." })
              }}
            >
              Erase everything
            </Button>
            <Button size="lg" variant="ghost" onClick={() => setConfirmErase(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
