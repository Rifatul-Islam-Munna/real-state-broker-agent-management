const DEFAULT_CURRENCY_SYMBOL = "$"
const DEFAULT_CURRENCY_CODE = "USD"
const DEFAULT_CURRENCY_LOCALE = "en-US"

export const CURRENCY_SYMBOL =
  process.env.NEXT_PUBLIC_CURRENCY_SYMBOL?.trim() || DEFAULT_CURRENCY_SYMBOL
export const CURRENCY_CODE =
  process.env.NEXT_PUBLIC_CURRENCY_CODE?.trim() || DEFAULT_CURRENCY_CODE
export const CURRENCY_LOCALE =
  process.env.NEXT_PUBLIC_CURRENCY_LOCALE?.trim() || DEFAULT_CURRENCY_LOCALE

export function parseCurrencyValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  const normalized = value?.replace(/[^0-9.-]/g, "") ?? ""
  const parsed = Number.parseFloat(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCurrencyAmount(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  const normalized = Number.isFinite(value) ? value : 0

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      currency: CURRENCY_CODE,
      maximumFractionDigits: 0,
      style: "currency",
      ...options,
    }).format(normalized)
  } catch {
    const minimumFractionDigits = options?.minimumFractionDigits ?? 0
    const maximumFractionDigits =
      options?.maximumFractionDigits ?? minimumFractionDigits

    return `${CURRENCY_SYMBOL}${normalized.toLocaleString(CURRENCY_LOCALE, {
      maximumFractionDigits,
      minimumFractionDigits,
    })}`
  }
}

export function formatCompactCurrencyAmount(value: number) {
  return formatCurrencyAmount(value, {
    maximumFractionDigits: 1,
    notation: "compact",
  })
}

export function formatPriceLabel(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return formatCurrencyAmount(value)
  }

  const raw = value?.trim() ?? ""

  if (!raw) {
    return formatCurrencyAmount(0)
  }

  const numericValue = parseCurrencyValue(raw)
  const suffixMatch = raw.match(/(\s*(?:\/[a-z]+|per\s+[a-z]+))$/i)
  const suffix = suffixMatch?.[1] ?? ""

  if (numericValue > 0 || /^0(?:[^\d]|$)/.test(raw)) {
    return `${formatCurrencyAmount(numericValue)}${suffix}`
  }

  if (/^[^\d-]+/.test(raw)) {
    return raw.replace(/^[^\d-]+/, CURRENCY_SYMBOL)
  }

  return raw
}
