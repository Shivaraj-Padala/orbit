import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { ChevronLeft, ChevronRight, Receipt, Repeat, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { EmptyState } from "@/components/empty-state"
import { Fab } from "@/components/fab"
import { PageHeader, SectionTitle } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { db, type PaymentMethod, type RecurringExpense, type Transaction } from "@/lib/db"
import { addMonths, formatDay, formatMonth, fromDateKey, toDateKey, toMonthKey } from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

import { getCategory } from "./categories"
import { monthRange } from "./data"
import { FixedView } from "./fixed-view"
import { paymentType } from "./payment-methods"
import { isActiveIn, statusIn } from "./recurring"
import { RecurringForm } from "./recurring-form"
import { TransactionForm } from "./transaction-form"

type SheetState = {
  open: boolean
  kind: "tx" | "fixed"
  tx?: Transaction
  item?: RecurringExpense
}

export function MoneyPage() {
  const { month: monthParam, tab = "spending" } = useSearch({ from: "/money" })
  const navigate = useNavigate({ from: "/money" })
  const { currency, monthlyBudget } = useSettings()
  const thisMonth = toMonthKey()
  const month = monthParam ?? thisMonth
  const [sheet, setSheet] = useState<SheetState>({ open: false, kind: "tx" })

  const txs = useLiveQuery(() => {
    const [from, to] = monthRange(month)
    return db.transactions.where("date").between(from, to, true, true).toArray()
  }, [month])
  // Fixed-expense entries for this month (they may be dated in another month if paid early).
  const fixedEntries = useLiveQuery(
    () => db.transactions.where("recurringId").above("").filter((t) => t.period === month).toArray(),
    [month]
  )
  const recurring = useLiveQuery(() => db.recurring.toArray(), [])
  const methodList = useLiveQuery(() => db.paymentMethods.toArray(), [])
  const lastMethodId = useLiveQuery(async () => {
    const last = await db.transactions
      .orderBy("date")
      .reverse()
      .filter((t) => t.type === "expense" && !!t.paymentMethodId && !t.recurringId)
      .first()
    return last?.paymentMethodId ?? ""
  }, [])

  const methods = new Map((methodList ?? []).map((m) => [m.id, m]))
  const list = [...(txs ?? [])].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  )
  const expenses = list.filter((t) => t.type === "expense")
  const spent = sum(expenses)
  const income = sum(list.filter((t) => t.type === "income"))

  // Fixed costs for this month that haven't been paid yet.
  const unpaidFixed = (recurring ?? [])
    .filter((r) => isActiveIn(r, month))
    .filter((r) => {
      const st = statusIn(r, month, fixedEntries ?? []).state
      return st === "due" || st === "overdue"
    })
    .reduce((s, r) => s + r.amount, 0)

  const byCategory = [...groupBy(expenses, (t) => t.category)]
    .map(([id, items]) => {
      const c = getCategory("expense", id)
      return { id, label: c.label, icon: c.icon, total: sum(items) }
    })
    .sort((a, b) => b.total - a.total)

  const byMethod = [...groupBy(expenses, (t) => t.paymentMethodId ?? "")]
    .map(([id, items]) => {
      const m = methods.get(id)
      const type = m ? paymentType(m.type) : undefined
      return {
        id: id || "none",
        label: m?.name ?? "Not recorded",
        // Skip the type when the name already says it ("UPI", "Cash").
        sublabel: m && type && m.name.toLowerCase() !== type.label.toLowerCase() ? type.label : undefined,
        icon: type?.icon ?? Receipt,
        total: sum(items),
      }
    })
    .sort((a, b) => b.total - a.total)

  const creditCardSpend = expenses
    .filter((t) => t.paymentMethodId && methods.get(t.paymentMethodId)?.type === "credit_card")
    .reduce((s, t) => s + t.amount, 0)

  const goTo = (m: string) =>
    void navigate({ search: (s) => ({ ...s, month: m === thisMonth ? undefined : m }), replace: true })
  const setTab = (t: string) =>
    void navigate({ search: (s) => ({ ...s, tab: t === "fixed" ? "fixed" : undefined }), replace: true })

  const money = (n: number, signed = false) => formatMoney(n, currency, { signed })
  const close = () => setSheet((s) => ({ ...s, open: false }))

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
            <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => goTo(addMonths(month, 1))}>
              <ChevronRight />
            </Button>
          </>
        }
      />

      <ToggleGroup type="single" aria-label="View" value={tab} onValueChange={(v) => v && setTab(v)} className="mb-4">
        <ToggleGroupItem value="spending">
          <Receipt /> Spending
        </ToggleGroupItem>
        <ToggleGroupItem value="fixed">
          <Repeat /> Fixed
        </ToggleGroupItem>
      </ToggleGroup>

      {tab === "fixed" ? (
        recurring !== undefined && (
          <FixedView
            month={month}
            items={recurring}
            entries={fixedEntries ?? []}
            methods={methods}
            income={income}
            currency={currency}
            onOpen={(item) => setSheet({ open: true, kind: "fixed", item })}
            onAdd={() => setSheet({ open: true, kind: "fixed" })}
          />
        )
      ) : (
        <>
          <Card className="gap-0 py-5">
            <CardContent>
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{money(spent)}</p>
              <BudgetLine
                spent={spent}
                unpaidFixed={unpaidFixed}
                budget={monthlyBudget}
                month={month}
                currency={currency}
              />
              <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4">
                <Figure label="Income" value={money(income)} />
                <Figure
                  label="Net"
                  value={money(income - spent, true)}
                  className={cn(income - spent < 0 && "text-destructive")}
                />
                <Figure label="On credit cards" value={money(creditCardSpend)} />
              </div>
            </CardContent>
          </Card>

          {byCategory.length > 0 && (
            <>
              <SectionTitle>Where it went</SectionTitle>
              <Breakdown rows={byCategory} total={spent} money={money} />
            </>
          )}

          {byMethod.length > 0 && (
            <>
              <SectionTitle>How you paid</SectionTitle>
              <Breakdown rows={byMethod} total={spent} money={money} />
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
                      {money(sum(items.filter((t) => t.type === "income")) - sum(items.filter((t) => t.type === "expense")), true)}
                    </span>
                  }
                >
                  {formatDay(day)}
                </SectionTitle>
                <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                  {items.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      method={tx.paymentMethodId ? methods.get(tx.paymentMethodId) : undefined}
                      money={money}
                      onOpen={() => setSheet({ open: true, kind: "tx", tx })}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <Fab
        label={tab === "fixed" ? "New fixed expense" : "New entry"}
        onClick={() => setSheet(tab === "fixed" ? { open: true, kind: "fixed" } : { open: true, kind: "tx" })}
      />

      <Sheet open={sheet.open} onOpenChange={(o) => (o ? undefined : close())}>
        <SheetContent aria-describedby={undefined}>
          {sheet.kind === "fixed" ? (
            <RecurringForm
              key={sheet.item?.id ?? "new-fixed"}
              item={sheet.item}
              currency={currency}
              defaultPaymentMethodId={lastMethodId ?? ""}
              onDone={close}
            />
          ) : (
            <TransactionForm
              key={sheet.tx?.id ?? "new"}
              transaction={sheet.tx}
              currency={currency}
              defaultPaymentMethodId={lastMethodId ?? ""}
              onDone={close}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function Figure({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 truncate font-semibold tabular-nums", className)}>{value}</p>
    </div>
  )
}

function TransactionRow({
  tx,
  method,
  money,
  onOpen,
}: {
  tx: Transaction
  method?: PaymentMethod
  money: (n: number) => string
  onOpen: () => void
}) {
  const cat = getCategory(tx.type, tx.category)
  const Icon = cat.icon
  const meta = [tx.note ? cat.label : null, method?.name].filter(Boolean).join(" · ")
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <div className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.75} />
          {tx.recurringId && (
            <span
              className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-card bg-foreground text-background"
              title="Fixed expense"
            >
              <Repeat className="size-2" strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{tx.note || cat.label}</p>
          {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
        </div>
        <span className={cn("shrink-0 text-[15px] font-medium tabular-nums", tx.type === "income" && "text-success")}>
          {tx.type === "income" ? "+" : "−"}
          {money(tx.amount)}
        </span>
      </button>
    </li>
  )
}

/** Ranked magnitude bars — one hue, values labelled, so no legend is needed. */
function Breakdown({
  rows,
  total,
  money,
}: {
  rows: { id: string; label: string; sublabel?: string; icon: LucideIcon; total: number }[]
  total: number
  money: (n: number) => string
}) {
  return (
    <Card>
      <CardContent className="grid gap-4">
        {rows.map(({ id, label, sublabel, icon: Icon, total: value }) => {
          const share = total > 0 ? (value / total) * 100 : 0
          return (
            <div key={id} className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{label}</span>
                    {sublabel && <span className="ml-1.5 text-xs text-muted-foreground">{sublabel}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {money(value)}
                    <span className="ml-1.5 text-xs text-muted-foreground">{Math.round(share)}%</span>
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary"
                  role="img"
                  aria-label={`${label}: ${Math.round(share)}% of spending`}
                >
                  <div className="h-full rounded-full bg-foreground/80" style={{ width: `${Math.max(share, 2)}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function BudgetLine({
  spent,
  unpaidFixed,
  budget,
  month,
  currency,
}: {
  spent: number
  unpaidFixed: number
  budget: number | null
  month: string
  currency: string
}) {
  const isCurrent = month === toMonthKey()
  if (!budget) {
    return (
      <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
        {isCurrent && unpaidFixed > 0 && (
          <p>
            <span className="font-medium text-foreground">{formatMoney(unpaidFixed, currency)}</span> in fixed
            costs still due
          </p>
        )}
        <p>
          <Link to="/settings" className="font-medium text-foreground underline underline-offset-4">
            Set a monthly budget
          </Link>{" "}
          to see what's safe to spend.
        </p>
      </div>
    )
  }
  const left = budget - spent
  const pct = (spent / budget) * 100
  const [y, m] = month.split("-").map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const daysLeft = isCurrent ? lastDay - fromDateKey(toDateKey()).getDate() + 1 : 0
  // What's left after setting aside fixed costs that haven't been paid yet.
  const safe = left - (isCurrent ? unpaidFixed : 0)

  return (
    <div className="mt-4">
      <Progress
        value={pct}
        aria-label="Budget used"
        indicatorClassName={cn(pct > 100 ? "bg-destructive" : pct > 85 ? "bg-foreground" : "bg-brand")}
      />
      <div className="mt-2 flex justify-between gap-2 text-sm">
        <span className={cn("font-medium", left < 0 && "text-destructive")}>
          {left >= 0 ? `${formatMoney(left, currency)} left` : `${formatMoney(-left, currency)} over budget`}
        </span>
        <span className="text-muted-foreground">of {formatMoney(budget, currency)}</span>
      </div>
      {isCurrent && left > 0 && (
        <div className="mt-3 rounded-lg bg-secondary px-3 py-2.5 text-[13px]">
          <p>
            <span className={cn("font-semibold", safe < 0 && "text-destructive")}>
              {formatMoney(Math.max(0, safe), currency)}
            </span>{" "}
            <span className="text-muted-foreground">safe to spend</span>
            {safe > 0 && daysLeft > 0 && (
              <span className="text-muted-foreground">
                {" "}
                · {formatMoney(safe / daysLeft, currency, { compact: true })}/day for {daysLeft}d
              </span>
            )}
          </p>
          {unpaidFixed > 0 && (
            <p className="mt-0.5 text-muted-foreground">
              after {formatMoney(unpaidFixed, currency)} of fixed costs still due
            </p>
          )}
        </div>
      )}
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
