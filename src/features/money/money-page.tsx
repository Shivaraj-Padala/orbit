import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react"
import { useState } from "react"

import { EmptyState } from "@/components/empty-state"
import { Fab } from "@/components/fab"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { db, type Transaction } from "@/lib/db"
import {
  addMonths,
  formatDay,
  formatMonth,
  fromDateKey,
  toDateKey,
  toMonthKey,
} from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

import { getCategory } from "./categories"
import { monthRange } from "./data"
import { TransactionForm } from "./transaction-form"

export function MoneyPage() {
  const { month: monthParam } = useSearch({ from: "/money" })
  const navigate = useNavigate({ from: "/money" })
  const { currency, monthlyBudget } = useSettings()
  const thisMonth = toMonthKey()
  const month = monthParam ?? thisMonth
  const [sheet, setSheet] = useState<{ open: boolean; tx?: Transaction }>({ open: false })

  const txs = useLiveQuery(() => {
    const [from, to] = monthRange(month)
    return db.transactions.where("date").between(from, to, true, true).toArray()
  }, [month])

  const list = [...(txs ?? [])].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  )
  const expenses = list.filter((t) => t.type === "expense")
  const spent = sum(expenses)
  const income = sum(list.filter((t) => t.type === "income"))

  const byCategory = [...groupBy(expenses, (t) => t.category)]
    .map(([id, items]) => ({ category: getCategory("expense", id), total: sum(items) }))
    .sort((a, b) => b.total - a.total)

  const goTo = (m: string) =>
    void navigate({ search: { month: m === thisMonth ? undefined : m }, replace: true })

  const money = (n: number, signed = false) => formatMoney(n, currency, { signed })

  return (
    <>
      <PageHeader
        title="Money"
        subtitle={formatMonth(month)}
        action={
          <>
            <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => goTo(addMonths(month, -1))}>
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              disabled={month >= thisMonth}
              onClick={() => goTo(addMonths(month, 1))}
            >
              <ChevronRight />
            </Button>
          </>
        }
      />

      <Card className="gap-0 py-5">
        <CardContent>
          <p className="text-sm text-muted-foreground">Spent</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{money(spent)}</p>
          <BudgetLine spent={spent} budget={monthlyBudget} month={month} currency={currency} />
          <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="mt-0.5 font-semibold tabular-nums">{money(income)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net</p>
              <p className={cn("mt-0.5 font-semibold tabular-nums", income - spent < 0 && "text-destructive")}>
                {money(income - spent, true)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {byCategory.length > 0 && (
        <>
          <SectionTitle>Where it went</SectionTitle>
          <Card className="gap-4">
            <CardContent className="grid gap-4">
              {byCategory.map(({ category, total }) => {
                const share = spent > 0 ? (total / spent) * 100 : 0
                const Icon = category.icon
                return (
                  <div key={category.id} className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{category.label}</span>
                        <span className="shrink-0 tabular-nums">
                          {money(total)}
                          <span className="ml-1.5 text-xs text-muted-foreground">{Math.round(share)}%</span>
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary"
                        role="img"
                        aria-label={`${category.label}: ${Math.round(share)}% of spending`}
                      >
                        <div className="h-full rounded-full bg-foreground/80" style={{ width: `${Math.max(share, 2)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}

      {txs !== undefined && list.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={month === thisMonth ? "No entries this month" : "No entries for this month"}
          description="Track a spend or income with the + button."
        />
      ) : (
        [...groupBy(list, (t) => t.date)].map(([day, items]) => (
          <section key={day}>
            <SectionTitle
              action={
                <span className="text-xs text-muted-foreground tabular-nums">
                  {money(-sum(items.filter((t) => t.type === "expense")) + sum(items.filter((t) => t.type === "income")), true)}
                </span>
              }
            >
              {formatDay(day)}
            </SectionTitle>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {items.map((tx) => {
                const cat = getCategory(tx.type, tx.category)
                const Icon = cat.icon
                return (
                  <li key={tx.id}>
                    <button
                      type="button"
                      onClick={() => setSheet({ open: true, tx })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">{tx.note || cat.label}</p>
                        {tx.note && <p className="truncate text-xs text-muted-foreground">{cat.label}</p>}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[15px] font-medium tabular-nums",
                          tx.type === "income" && "text-success"
                        )}
                      >
                        {tx.type === "income" ? "+" : "−"}
                        {money(tx.amount)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}

      <Fab label="New entry" onClick={() => setSheet({ open: true })} />

      <Sheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))}>
        <SheetContent aria-describedby={undefined}>
          <TransactionForm
            key={sheet.tx?.id ?? "new"}
            transaction={sheet.tx}
            currency={currency}
            onDone={() => setSheet((s) => ({ ...s, open: false }))}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

function BudgetLine({
  spent,
  budget,
  month,
  currency,
}: {
  spent: number
  budget: number | null
  month: string
  currency: string
}) {
  if (!budget) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        <Link to="/settings" className="font-medium text-foreground underline underline-offset-4">
          Set a monthly budget
        </Link>{" "}
        to see what's left.
      </p>
    )
  }
  const left = budget - spent
  const pct = (spent / budget) * 100
  const isCurrent = month === toMonthKey()
  const [y, m] = month.split("-").map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const daysLeft = isCurrent ? lastDay - fromDateKey(toDateKey()).getDate() + 1 : 0

  return (
    <div className="mt-4">
      <Progress
        value={pct}
        aria-label="Budget used"
        indicatorClassName={cn(pct > 100 ? "bg-destructive" : pct > 85 ? "bg-foreground" : "bg-brand")}
      />
      <div className="mt-2 flex justify-between gap-2 text-sm">
        <span className={cn("font-medium", left < 0 && "text-destructive")}>
          {left >= 0
            ? `${formatMoney(left, currency)} left`
            : `${formatMoney(-left, currency)} over budget`}
        </span>
        <span className="text-muted-foreground">
          {isCurrent && left > 0 && daysLeft > 0
            ? `${formatMoney(left / daysLeft, currency, { compact: true })}/day · ${daysLeft}d left`
            : `of ${formatMoney(budget, currency)}`}
        </span>
      </div>
    </div>
  )
}

function sum(txs: Transaction[]) {
  return txs.reduce((s, t) => s + t.amount, 0)
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const bucket = map.get(k)
    if (bucket) bucket.push(item)
    else map.set(k, [item])
  }
  return map
}
