import { Link, Outlet } from "@tanstack/react-router"
import {
  CircleCheckBig,
  HeartPulse,
  House,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Today", icon: House },
  { to: "/tasks", label: "Tasks", icon: CircleCheckBig },
  { to: "/money", label: "Money", icon: Wallet },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/wellbeing", label: "Wellbeing", icon: HeartPulse },
]

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <main className="flex-1 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/", includeSearch: false }}
              className="group flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-foreground"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                      isActive && "bg-secondary"
                    )}
                  >
                    <Icon
                      className="size-[22px]"
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                  </span>
                  {label}
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
