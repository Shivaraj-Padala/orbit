import { db } from "./db"

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied"
  if (Notification.permission !== "default") return Notification.permission
  return Notification.requestPermission()
}

async function notify(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return
  const options: NotificationOptions = {
    body,
    tag,
    icon: `${import.meta.env.BASE_URL}pwa-192.png`,
    badge: `${import.meta.env.BASE_URL}pwa-192.png`,
    data: { url: "./#/tasks" },
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return
    }
  } catch {
    /* fall through to a page notification */
  }
  new Notification(title, options)
}

/** Fire any reminders that are due and mark them as sent. */
export async function checkReminders() {
  const now = new Date().toISOString()
  const due = await db.tasks
    .where("remindAt")
    .belowOrEqual(now)
    .filter((t) => !t.done && !t.reminded)
    .toArray()
  for (const task of due) {
    await notify(task.title, task.notes || "Reminder from Orbit", task.id)
    await db.tasks.update(task.id, { reminded: true })
  }
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Schedule a precise timer for the next upcoming reminder. */
async function scheduleNext() {
  clearTimeout(timer)
  const now = new Date().toISOString()
  const next = await db.tasks
    .where("remindAt")
    .above(now)
    .filter((t) => !t.done && !t.reminded)
    .first()
  if (!next?.remindAt) return
  const delay = Math.min(new Date(next.remindAt).getTime() - Date.now(), 2 ** 31 - 1)
  timer = setTimeout(async () => {
    await checkReminders()
    await scheduleNext()
  }, Math.max(0, delay) + 250)
}

/**
 * Reminders run while the app is open (or suspended in the background on
 * platforms that allow it). Overdue reminders fire as soon as Orbit opens.
 */
export function startReminders() {
  const run = async () => {
    await checkReminders()
    await scheduleNext()
  }
  void run()
  // Hooks run inside Dexie transactions; defer outside them. The body must
  // return undefined (a "creating" hook's return value becomes the key).
  const later = () => {
    setTimeout(run, 50)
  }
  db.tasks.hook("creating", later)
  db.tasks.hook("updating", later)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void run()
  })
  setInterval(run, 60_000)
}
