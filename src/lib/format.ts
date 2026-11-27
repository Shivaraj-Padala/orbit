export function formatMoney(
  amount: number,
  currency: string,
  opts: { compact?: boolean; signed?: boolean } = {}
): string {
  const fmt = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: opts.compact || Number.isInteger(amount) ? 0 : 2,
    notation: opts.compact && Math.abs(amount) >= 100_000 ? "compact" : "standard",
    signDisplay: opts.signed ? "exceptZero" : "auto",
  })
  return fmt.format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
}

export const CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "SGD",
  "AED",
  "JPY",
] as const
