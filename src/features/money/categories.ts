import {
  Briefcase,
  Car,
  CircleDashed,
  Clapperboard,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react"

import type { TransactionType } from "@/lib/db"

export interface Category {
  id: string
  label: string
  icon: LucideIcon
}

export const CATEGORIES: Record<TransactionType, Category[]> = {
  expense: [
    { id: "food", label: "Food", icon: Utensils },
    { id: "groceries", label: "Groceries", icon: ShoppingBasket },
    { id: "transport", label: "Transport", icon: Car },
    { id: "shopping", label: "Shopping", icon: ShoppingBag },
    { id: "bills", label: "Bills", icon: Receipt },
    { id: "home", label: "Home", icon: House },
    { id: "health", label: "Health", icon: HeartPulse },
    { id: "fun", label: "Fun", icon: Clapperboard },
    { id: "travel", label: "Travel", icon: Plane },
    { id: "learning", label: "Learning", icon: GraduationCap },
    { id: "gifts", label: "Gifts", icon: Gift },
    { id: "other", label: "Other", icon: CircleDashed },
  ],
  income: [
    { id: "salary", label: "Salary", icon: Briefcase },
    { id: "freelance", label: "Freelance", icon: Laptop },
    { id: "investments", label: "Investments", icon: TrendingUp },
    { id: "gifts", label: "Gifts", icon: Gift },
    { id: "other", label: "Other", icon: CircleDashed },
  ],
}

export function getCategory(type: TransactionType, id: string): Category {
  return (
    CATEGORIES[type].find((c) => c.id === id) ?? {
      id,
      label: id,
      icon: CircleDashed,
    }
  )
}
