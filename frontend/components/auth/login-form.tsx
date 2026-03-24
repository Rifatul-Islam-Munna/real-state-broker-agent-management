"use client"

import Link from "next/link"
import { useActionState } from "react"

import { loginAction, type AuthActionState } from "@/lib/auth-actions"

const initialState: AuthActionState = { error: null }

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState)

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700" htmlFor="email">
          {"Email"}
        </label>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
          id="email"
          name="email"
          placeholder="admin@estateblue.com"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700" htmlFor="password">
          {"Password"}
        </label>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </div>
      {state.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      ) : null}
      <button
        className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing In..." : "Sign In"}
      </button>
      <p className="text-center text-sm text-slate-500">
        {"Need an account? "}
        <Link className="font-bold text-primary" href="/register">
          {"Create one"}
        </Link>
      </p>
    </form>
  )
}
