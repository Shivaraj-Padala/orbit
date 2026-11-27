import {
  Banknote,
  CircleDashed,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { z } from "zod"

import { db, newId, nowIso, type PaymentMethod, type PaymentMethodType } from "@/lib/db"

export const PAYMENT_TYPES: { id: PaymentMethodType; label: string; icon: LucideIcon }[] = [
  { id: "credit_card", label: "Credit card", icon: CreditCard },
  { id: "debit_card", label: "Debit card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "bank", label: "Bank transfer", icon: Landmark },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "other", label: "Other", icon: CircleDashed },
]

export const paymentType = (type: PaymentMethodType) =>
  PAYMENT_TYPES.find((t) => t.id === type) ?? PAYMENT_TYPES[PAYMENT_TYPES.length - 1]

export const paymentMethodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give it a name, like “HDFC Millennia”")
    .max(40, "Keep it under 40 characters")
    // Guard against someone typing a full card number into the name.
    .refine((v) => !/\d[\d\s-]{11,}\d/.test(v), "Don't enter card numbers — a name is enough"),
  type: z.enum(["credit_card", "debit_card", "upi", "cash", "bank", "wallet", "other"]),
})

export type PaymentMethodValues = z.input<typeof paymentMethodSchema>

export async function savePaymentMethod(values: PaymentMethodValues, existing?: PaymentMethod) {
  const v = paymentMethodSchema.parse(values)
  if (existing) {
    await db.paymentMethods.update(existing.id, { name: v.name, type: v.type })
    return existing.id
  }
  const id = newId()
  await db.paymentMethods.add({ id, name: v.name, type: v.type, archived: false, createdAt: nowIso() })
  return id
}

export const archivePaymentMethod = (id: string) =>
  db.paymentMethods.update(id, { archived: true })

/** Display label: "HDFC Millennia" or "Cash"; type is shown alongside when it adds information. */
export function methodLabel(method: PaymentMethod | undefined) {
  return method ? method.name : "Not set"
}
