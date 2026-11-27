import { Check, Repeat } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { SectionTitle } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { PaymentMethod, RecurringExpense, Transaction } from "@/lib/db"
import { formatDay, formatMonth, formatMonthShort, fromDateKey, toMonthKey } from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

import { getCategory } from "./categories"
import {
  dueDateIn,
  emiProgress,
  isActiveIn,
  markPaid,
  statusIn,
  unmarkPaid,
  type DueStatus,
} from "./recurring"

export function FixedView({
  month,
  items,
  entries,
  methods,
  income,
  currency,
  onOpen,
  onAdd,
}: {
  month: string
  items: RecurringExpense[]
  entries: Transaction[]
  methods: Map<string, PaymentMethod>
  income: number
  currency: string
  onOpen: (item: RecurringExpense) => void
  onAdd: () => void
}) {
  const money = (n: number) => formatMoney(n, currency)

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="No fixed expenses yet"
        description="Add rent, subscriptions, bills and loan EMIs to see what's committed every month."
        action={<Button onClick={onAdd}>Add a fixed expense</Button>}
      />
    )
  }

  const active = items
    .filter((r) => isActiveIn(r, month))
    .sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name))
  const inactive = items.filter((r) => !isActiveIn(r, month))
  const loans = active.filter((r) => r.kind === "emi")
  const bills = active.filter((r) => r.kind === "bill")

  const total = active.reduce((s, r) => s + r.amount, 0)
  const emiTotal = loans.reduce((s, r) => s + r.amount, 0)
  const statuses = active.map((r) => ({ r, st: statusIn(r, month, entries) }))
  const paid = statuses.reduce((s, { st }) => s + (st.state === "paid" ? st.entry.amount : 0), 0)
  const stillDue = statuses
    .filter(({ st }) => st.state === "due" || st.state === "overdue")
    .reduce((s, { r }) => s + r.amount, 0)
  const loanBalance = items
    .filter((r) => r.kind === "emi")
    .reduce((s, r) => s + emiProgress(r).remaining, 0)

  return (
    <>
      <Card className="gap-0 py-5">
        <CardContent>
          <p className="text-sm text-muted-foreground">Fixed each month</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{money(total)}</p>
          {total > 0 && (
            <div className="mt-4">
              <Progress value={(paid / total) * 100} aria-label="Fixed costs paid this month" indicatorClassName="bg-success" />
              <div className="mt-2 flex justify-between gap-2 text-sm">
                <span className="font-medium">{money(paid)} paid</span>
                <span className="text-muted-foreground">{money(stillDue)} still due</span>
              </div>
            </div>
          )}
          <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4">
            <Figure label="EMIs" value={money(emiTotal)} />
            <Figure label="Bills" value={money(total - emiTotal)} />
            <Figure
              label="Of income"
              value={income > 0 ? `${Math.round((total / income) * 100)}%` : "—"}
            />
          </div>
          {loanBalance > 0 && (
            <p className="mt-4 rounded-lg bg-secondary px-3 py-2.5 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">{money(loanBalance)}</span> left to repay across{" "}
              {items.filter((r) => r.kind === "emi" && emiProgress(r).left > 0).length} loan
              {items.filter((r) => r.kind === "emi" && emiProgress(r).left > 0).length === 1 ? "" : "s"}
            </p>
          )}
        </CardContent>
      </Card>

      {loans.length > 0 && (
        <>
          <SectionTitle>Loans & EMIs</SectionTitle>
          <div className="grid gap-3">
            {loans.map((r) => (
              <LoanCard
                key={r.id}
                item={r}
                month={month}
                status={statusIn(r, month, entries)}
                method={r.paymentMethodId ? methods.get(r.paymentMethodId) : undefined}
                currency={currency}
                onOpen={onOpen}
              />
            ))}
          </div>
        </>
      )}

      {bills.length > 0 && (
        <>
          <SectionTitle>Bills & subscriptions</SectionTitle>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {bills.map((r) => (
              <RecurringRow
                key={r.id}
                item={r}
                month={month}
                status={statusIn(r, month, entries)}
                method={r.paymentMethodId ? methods.get(r.paymentMethodId) : undefined}
                currency={currency}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </>
      )}

      {inactive.length > 0 && (
        <>
          <SectionTitle>Not active in {formatMonth(month).split(" ")[0]}</SectionTitle>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {inactive.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-muted-foreground hover:bg-accent/50"
                >
                  <span className="min-w-0 flex-1 truncate text-[15px]">{r.name}</span>
                  <span className="shrink-0 text-xs">
                    {r.endMonth && r.endMonth < month
                      ? `${r.kind === "emi" ? "Paid off" : "Ended"} ${formatMonth(r.endMonth)}`
                      : `Starts ${formatMonth(r.startMonth)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function statusText(status: DueStatus, dueDate: string) {
  if (status.state === "paid") return "Paid"
  if (status.state === "unconfirmed") return `Was due ${formatDay(dueDate)} · mark if paid`
  if (status.state === "overdue") return `Overdue since ${formatDay(dueDate)}`
  if (status.days === 0) return "Due today"
  if (status.days === 1) return "Due tomorrow"
  if (status.days <= 7) return `Due in ${status.days} days`
  return `Due ${fromDateKey(dueDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
}

function PayButton({
  item,
  month,
  status,
}: {
  item: RecurringExpense
  month: string
  status: DueStatus
}) {
  if (status.state === "paid") {
    return (
      <Button
        size="sm"
        variant="secondary"
        className="text-success"
        aria-label={`${item.name} is paid — tap to undo`}
        onClick={() => void unmarkPaid(status.entry)}
      >
        <Check /> Paid
      </Button>
    )
  }
  return (
    <Button size="sm" variant={status.state === "overdue" ? "default" : "outline"} onClick={() => void markPaid(item, month)}>
      Mark paid
    </Button>
  )
}

export function RecurringRow({
  item,
  month,
  status,
  method,
  currency,
  onOpen,
}: {
  item: RecurringExpense
  month: string
  status: DueStatus
  method?: PaymentMethod
  currency: string
  onOpen?: (item: RecurringExpense) => void
}) {
  const cat = getCategory("expense", item.category)
  const Icon = cat.icon
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={() => onOpen?.(item)}
        disabled={!onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">
            {item.name}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground tabular-nums">
              {formatMoney(item.amount, currency)}
            </span>
          </p>
          <p
            className={cn(
              "truncate text-xs text-muted-foreground",
              status.state === "overdue" && "text-destructive"
            )}
          >
            {statusText(status, dueDateIn(item, month))}
            {method && ` · ${method.name}`}
          </p>
        </div>
      </button>
      <PayButton item={item} month={month} status={status} />
    </li>
  )
}

function LoanCard({
  item,
  month,
  status,
  method,
  currency,
  onOpen,
}: {
  item: RecurringExpense
  month: string
  status: DueStatus
  method?: PaymentMethod
  currency: string
  onOpen: (item: RecurringExpense) => void
}) {
  const p = emiProgress(item, month === toMonthKey() ? undefined : month)
  return (
    <div className="rounded-xl border bg-card p-4">
      <button type="button" onClick={() => onOpen(item)} className="block w-full min-w-0 text-left">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[15px] font-semibold">{item.name}</p>
          <p className="shrink-0 text-sm tabular-nums">
            {formatMoney(item.amount, currency)}
            <span className="text-muted-foreground">/mo</span>
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.endMonth ? `Ends ${formatMonthShort(item.endMonth)}` : "No end date"}
          {method && ` · ${method.name}`}
        </p>
        <Progress
          value={p.total ? (p.paid / p.total) * 100 : 0}
          className="mt-3"
          aria-label={`${item.name}: ${p.paid} of ${p.total} EMIs paid`}
          indicatorClassName="bg-brand"
        />
        <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{p.paid}</span> of {p.total} EMIs paid
          </span>
          <span className="tabular-nums">{formatMoney(p.remaining, currency)} to go</span>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <p className={cn("min-w-0 truncate text-xs text-muted-foreground", status.state === "overdue" && "text-destructive")}>
          {statusText(status, dueDateIn(item, month))}
        </p>
        <PayButton item={item} month={month} status={status} />
      </div>
    </div>
  )
}
