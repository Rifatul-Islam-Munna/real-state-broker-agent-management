"use client"

import { useEffect } from "react"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center p-6"><section className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">Access unavailable</p><h1 className="mt-3 text-3xl font-bold">Your tenant dashboard cannot be opened.</h1><p className="mt-4 leading-7 text-slate-600">{error.message || "Your account may be blocked, expired, unauthorized, or temporarily unavailable."}</p><button className="mt-6 rounded-xl bg-[#0b1c30] px-5 py-3 font-semibold text-white" onClick={reset}>Try again</button></section></main>
}
