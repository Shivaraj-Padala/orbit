import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border bg-card p-3.5", className)}>
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
