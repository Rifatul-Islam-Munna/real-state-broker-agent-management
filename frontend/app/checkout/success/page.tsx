import Link from "next/link"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

type Props = { searchParams: Promise<{ session_id?: string }> }

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams
  let result: { completed: boolean; kind: "purchase" | "renewal" } | null = null
  let error: string | null = null

  if (!sessionId) {
    error = "Stripe session is missing."
  } else {
    const response = await fetch(`${baseUrl}/public-saas/checkout-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
      cache: "no-store",
    })
    if (response.ok) result = await response.json()
    else {
      const payload = await response.json().catch(() => ({}))
      error = Array.isArray(payload.message) ? payload.message[0] : payload.message ?? "Payment confirmation failed."
    }
  }

  const href = result?.kind === "renewal" ? "/dashboard/subscription" : "/login?registered=tenant"
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">{error ? "Payment needs attention" : "Payment confirmed"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {error ?? (result?.kind === "renewal"
            ? "Your subscription was updated and your existing tenant database was preserved."
            : "Your tenant account and isolated database were created successfully.")}
        </p>
        <Link className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#4343d5] px-5 font-semibold text-white" href={error ? "/pricing" : href}>
          {error ? "Return to pricing" : result?.kind === "renewal" ? "View subscription" : "Sign in"}
        </Link>
      </section>
    </main>
  )
}
