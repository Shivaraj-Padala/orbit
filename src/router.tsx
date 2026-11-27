import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router"
import { z } from "zod"

import { AppShell } from "@/components/app-shell"
import { TASK_VIEWS } from "@/features/tasks/data"
import { TodayPage } from "@/features/today/today-page"

// Today is the landing page; other sections load on demand (and are
// precached by the service worker for offline use).
const TasksPage = lazyRouteComponent(() => import("@/features/tasks/tasks-page"), "TasksPage")
const MoneyPage = lazyRouteComponent(() => import("@/features/money/money-page"), "MoneyPage")
const GoalsPage = lazyRouteComponent(() => import("@/features/goals/goals-page"), "GoalsPage")
const WellbeingPage = lazyRouteComponent(() => import("@/features/wellbeing/wellbeing-page"), "WellbeingPage")
const SettingsPage = lazyRouteComponent(() => import("@/features/settings/settings-page"), "SettingsPage")

const rootRoute = createRootRoute({ component: AppShell })

const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: TodayPage,
})

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  validateSearch: z.object({
    view: z.enum(TASK_VIEWS).optional().catch(undefined),
  }),
  component: TasksPage,
})

const moneyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/money",
  validateSearch: z.object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional()
      .catch(undefined),
  }),
  component: MoneyPage,
})

const goalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/goals",
  component: GoalsPage,
})

const wellbeingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wellbeing",
  component: WellbeingPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  todayRoute,
  tasksRoute,
  moneyRoute,
  goalsRoute,
  wellbeingRoute,
  settingsRoute,
])

export const router = createRouter({
  routeTree,
  // Hash URLs work on any static host (e.g. GitHub Pages) and offline.
  history: createHashHistory(),
  defaultPreload: "intent",
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
