import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { captureInstallPrompt } from "./lib/install"
import { startReminders } from "./lib/reminders"
import { initTheme } from "./lib/theme"
import { router } from "./router"

initTheme()
captureInstallPrompt()
startReminders()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
