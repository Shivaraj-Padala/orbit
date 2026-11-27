import { useSyncExternalStore } from "react"

export type Theme = "light" | "dark" | "system"

const KEY = "orbit-theme"
const media = () => window.matchMedia("(prefers-color-scheme: dark)")
const listeners = new Set<() => void>()

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === "light" || v === "dark" || v === "system") return v
  } catch {
    /* storage unavailable */
  }
  return "system"
}

let current: Theme = read()

export function resolveTheme(t: Theme): "light" | "dark" {
  if (t === "system") return media().matches ? "dark" : "light"
  return t
}

function apply() {
  const dark = resolveTheme(current) === "dark"
  document.documentElement.classList.toggle("dark", dark)
  const color = getComputedStyle(document.body).backgroundColor
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", color || (dark ? "#111111" : "#ffffff"))
}

export function initTheme() {
  apply()
  media().addEventListener("change", () => {
    if (current === "system") {
      apply()
      listeners.forEach((l) => l())
    }
  })
}

export function setTheme(t: Theme) {
  current = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* storage unavailable */
  }
  apply()
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  return { theme, resolved: resolveTheme(theme), setTheme }
}
