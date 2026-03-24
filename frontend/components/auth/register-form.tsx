"use client"

import Link from "next/link"
import { useActionState } from "react"

import { registerAction, type AuthActionState } from "@/lib/auth-actions"

const initialState: AuthActionState = { error: null }

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState)

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700" htmlFor="firstName">
            {"First Name"}
          </label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            id="firstName"
            name="firstName"
            placeholder="Estate"
            required
            type="text"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700" htmlFor="lastName">
            {"Last Name"}
          </label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            id="lastName"
            name="lastName"
            placeholder="Admin"
            required
            type="text"
          />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
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
          <label className="text-sm font-bold text-slate-700" htmlFor="phone">
            {"Phone"}
          </label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            id="phone"
            name="phone"
            placeholder="+1 555 000 0000"
            type="tel"
          />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700" htmlFor="password">
            {"Password"}
          </label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            id="password"
            name="password"
            placeholder="Choose a secure password"
            required
            type="password"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700" htmlFor="role">
            {"Role"}
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            defaultValue="Admin"
            id="role"
            name="role"
          >
            <option value="Admin">
              {"Admin"}
            </option>
            <option value="Agent">
              {"Agent"}
            </option>
          </select>
        </div>
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
        {pending ? "Creating Account..." : "Create Account"}
      </button>
      <p className="text-center text-sm text-slate-500">
        {"Already have an account? "}
        <Link className="font-bold text-primary" href="/login">
          {"Sign in"}
        </Link>
      </p>
    </form>
  )
}
