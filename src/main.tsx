import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { captureInstallPrompt } from "./lib/install"
import { startAutoLog } from "./features/money/recurring"
import { startReminders } from "./lib/reminders"
import { initTheme } from "./lib/theme"
import { router } from "./router"

initTheme()
captureInstallPrompt()
startReminders()
startAutoLog()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
