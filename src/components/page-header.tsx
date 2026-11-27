import type { ReactNode } from "react"

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-3 pt-4 pb-5">
      <div className="min-w-0">
        {subtitle && (
          <p className="text-sm font-medium text-muted-foreground">{subtitle}</p>
        )}
        <h1 className="truncate text-[28px] leading-tight font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
    </header>
  )
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
        {children}
      </h2>
      {action}
    </div>
  )
}
