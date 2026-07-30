"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState, useState } from "react"
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginAction, type AuthActionState } from "@/lib/auth-actions"

const initialState: AuthActionState = { error: null }

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") ?? ""

  return (
    <form action={action} className="space-y-5">
      <input name="next" type="hidden" value={nextPath} />

      {nextPath ? (
        <Alert className="rounded-lg border-[#c7c4d7] bg-[#eff4ff] text-[#4343d5]">
          <AlertDescription>Sign in and return to your requested page.</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#464555]" htmlFor="email">
          Work email
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#767586]" />
          <input
            autoComplete="email"
            className="h-14 w-full rounded-lg border border-[#c7c4d7] bg-white pl-12 pr-4 text-sm text-[#0b1c30] outline-none transition placeholder:text-[#767586]/60 focus:border-[#4343d5] focus:ring-4 focus:ring-[#4343d5]/10"
            id="email"
            name="email"
            placeholder="name@company.com"
            required
            type="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#464555]" htmlFor="password">
            Password
          </label>
          <span className="text-[11px] font-medium text-[#767586]">Minimum 6 characters</span>
        </div>
        <div className="relative">
          <LockKeyhole className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#767586]" />
          <input
            autoComplete="current-password"
            className="h-14 w-full rounded-lg border border-[#c7c4d7] bg-white pl-12 pr-12 text-sm text-[#0b1c30] outline-none transition placeholder:text-[#767586]/60 focus:border-[#4343d5] focus:ring-4 focus:ring-[#4343d5]/10"
            id="password"
            name="password"
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#767586] transition hover:text-[#0b1c30]"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 py-1 text-xs font-medium text-[#464555]">
        <input className="size-4 rounded border-[#c7c4d7] text-[#4343d5] focus:ring-[#4343d5]/20" name="remember" type="checkbox" />
        Keep me signed in for 30 days
      </label>

      {state.error ? (
        <Alert className="rounded-lg" variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <button
        className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#4343d5] px-6 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)] transition hover:bg-[#3939b5] hover:shadow-[0_12px_28px_rgba(67,67,213,0.28)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in..." : "Sign in"}
        <ArrowRight className="size-[18px]" />
      </button>

      <p className="pt-5 text-center text-xs font-medium text-[#464555]">
        New to EstateBlue Enterprise?
        <Link className="ml-1.5 font-bold text-[#4343d5] hover:underline" href="/register">
          Request access
        </Link>
      </p>
    </form>
  )
}
