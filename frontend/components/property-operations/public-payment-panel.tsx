"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CreditCard } from "lucide-react"
import { opsPayment, type PaymentState } from "@/lib/ops-payment"

export function PublicPaymentPanel({ token, state }: { token: string; state: PaymentState }) {
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(Boolean(state.paymentVerified))
  const [error, setError] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get("session_id")
    const paymentToken = params.get("payment_token")
    if (!sessionId || !paymentToken) return
    setLoading(true)
    opsPayment.verify(token, sessionId, paymentToken)
      .then((result) => setPaid(result.paid))
      .catch((value) => setError(value instanceof Error ? value.message : "Payment verification failed."))
      .finally(() => setLoading(false))
  }, [token])

  async function pay() {
    setLoading(true)
    setError("")
    try {
      const cleanUrl = `${window.location.origin}${window.location.pathname}`
      const result = await opsPayment.create(token, cleanUrl, cleanUrl)
      window.location.assign(result.checkoutUrl)
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not start payment.")
      setLoading(false)
    }
  }

  if (!state.paymentEnabled && !paid) return null
  if (paid) return <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="size-6" /><div><p className="font-semibold">Payment verified</p><p className="text-xs">This billing record is marked paid.</p></div></div>

  return <div className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-semibold">Secure online payment</p><p className="mt-1 text-sm text-muted-foreground">Amount: {state.paymentCurrency ?? "USD"} {(state.paymentAmount ?? 0).toLocaleString()}</p></div><CreditCard className="size-6 text-muted-foreground" /></div>{error ? <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}<button className="mt-4 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50" disabled={loading} onClick={() => void pay()} type="button">{loading ? "Processing..." : "Pay securely"}</button></div>
}
