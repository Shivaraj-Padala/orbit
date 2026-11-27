import type { ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import type { TransactionType } from "@/lib/db"
import { cn } from "@/lib/utils"

import { CATEGORIES } from "./categories"
import { currencySymbol } from "./data"

export function AmountInput({
  currency,
  className,
  ...props
}: ComponentProps<typeof Input> & { currency: string }) {
  const symbol = currencySymbol(currency)
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl font-medium text-muted-foreground">
        {symbol}
      </span>
      <Input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        className={cn("h-16 text-3xl! font-semibold tracking-tight tabular-nums", className)}
        style={{ paddingLeft: `${Math.max(2.5, symbol.length * 0.9 + 1.5)}rem` }}
        {...props}
      />
    </div>
  )
}

export function CategoryPicker({
  type,
  value,
  onChange,
}: {
  type: TransactionType
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div role="radiogroup" aria-label="Category" className="grid grid-cols-4 gap-2">
      {CATEGORIES[type].map(({ id, label, icon: Icon }) => {
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-[11px] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
            <span className="w-full truncate">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
