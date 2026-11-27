# Orbit

A personal companion app: tasks with reminders, spending, goals and wellbeing —
in one installable, offline-first PWA. All data stays on the device in IndexedDB.

## Features

- **Today** — a dashboard of what's due, bills due this week, this month's spending, today's check-in and active goals.
- **Tasks** — quick add, due dates, priorities and reminders (browser notifications). Views for Today, Upcoming, Anytime and Done.
- **Money** — log expenses and income by category and payment method, with monthly totals, breakdowns by category and by how you paid, credit-card spend and an optional budget with "safe to spend".
  - **Payment methods** — name your credit/debit cards, UPI, bank, wallet and cash (names only, never card numbers). Every expense asks what it was paid with.
  - **Fixed expenses** — monthly bills and subscriptions, and loans/EMIs with a first and last EMI month. Each can log itself on its due day or be marked paid; loans show EMIs paid, months left and the balance to repay.
- **Goals** — numeric goals with a unit, target date and one-tap progress.
- **Wellbeing** — daily mood, water, sleep, energy, movement and a journal, with a 7-day overview.
- **Settings** — light/dark/auto theme, currency, budget, water goal, install prompt, JSON backup/restore and erase.

## Stack

- React 19 + TypeScript + Vite, React Compiler
- [shadcn/ui](https://ui.shadcn.com) components on Radix, Tailwind CSS v4
- [TanStack Router](https://tanstack.com/router) (code-based routes, hash history, zod-validated search params)
- [TanStack Form](https://tanstack.com/form) with [zod](https://zod.dev) schemas
- [Dexie](https://dexie.org) over IndexedDB, with live queries
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) (Workbox) for the manifest and offline service worker

## Development

```sh
pnpm install
pnpm dev       # start the dev server
pnpm build     # type-check and build to dist/
pnpm preview   # serve the production build (service worker enabled)
pnpm lint
```

`pnpm-workspace.yaml` sets `minimumReleaseAge` to 24h, matching CI (pnpm 12),
so new dependencies resolve to versions CI will accept.

## Project layout

```
src/
  components/ui/   shadcn/ui components
  components/      app shell, page header, form field, etc.
  features/        one folder per section (today, tasks, money, goals, wellbeing, settings)
  lib/             db (Dexie schema), dates, formatting, theme, reminders, backup
  router.tsx       routes
```

## Reminders

Reminders fire as browser notifications while Orbit is open or suspended in the
background, and any missed reminders fire as soon as the app is opened again.
Guaranteed delivery while the app is fully closed would need a push server,
which this local-only app intentionally doesn't use.
