import { useLiveQuery } from "dexie-react-hooks"

import { db, defaultSettings, type Settings } from "./db"

/** App settings merged over defaults. `loaded` is false until IndexedDB answers. */
export function useSettings(): Settings & { loaded: boolean } {
  const stored = useLiveQuery(
    () => db.settings.get("app").then((s) => s ?? null),
    []
  )
  return { ...defaultSettings, ...stored, loaded: stored !== undefined }
}

export async function updateSettings(patch: Partial<Omit<Settings, "key">>) {
  const current = (await db.settings.get("app")) ?? defaultSettings
  await db.settings.put({ ...current, ...patch, key: "app" })
}
