"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"

import { loginAction, type AuthActionState } from "@/lib/auth-actions"

const initialState: AuthActionState = { error: null }

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState)
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") ?? ""

  return (
    <form action={action} className="space-y-5">
      <input name="next" type="hidden" value={nextPath} />
      {nextPath ? (
        <div className="border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-slate-600">
          {"Sign in and you will return to your requested page."}
        </div>
      ) : null}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500" htmlFor="email">
          {"Email"}
        </label>
        <input
          className="w-full border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
          id="email"
          name="email"
          placeholder="admin@estateblue.com"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500" htmlFor="password">
            {"Password"}
          </label>
          <span className="text-xs font-semibold text-slate-400">
            {"Minimum 6 characters"}
          </span>
        </div>
        <input
          className="w-full border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {"Portal access is secured with your backend auth session cookies."}
        </span>
        <Link className="font-bold text-primary" href="/register">
          {"Create account"}
        </Link>
      </div>
      {state.error ? (
        <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      ) : null}
      <button
        className="w-full bg-primary px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing In..." : "Sign In"}
      </button>
      <div className="border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
        {"Need a fresh workspace account? "}
        <Link className="font-bold text-primary" href="/register">
          {"Register here"}
        </Link>
      </div>
    </form>
  )
}
