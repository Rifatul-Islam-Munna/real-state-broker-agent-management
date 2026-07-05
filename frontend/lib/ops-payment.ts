const base = "/api/property-operations-proxy/property-operations/public"

async function post<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const payload = await response.json()
  if (!response.ok) throw new Error(String(payload?.message ?? "Payment request failed."))
  return payload as T
}

export type PaymentState = {
  paymentEnabled?: boolean
  paymentAmount?: number | null
  paymentCurrency?: string
  paymentVerified?: boolean
  linkedRecordStatus?: string | null
}

export const opsPayment = {
  create: (token: string, successUrl: string, cancelUrl: string) => post<{ checkoutUrl: string }>(`${base}/${encodeURIComponent(token)}/checkout`, { successUrl, cancelUrl }),
  verify: (token: string, sessionId: string, paymentToken: string) => post<{ paid: boolean; paymentStatus: string | null }>(`${base}/${encodeURIComponent(token)}/checkout/verify`, { sessionId, paymentToken }),
}
