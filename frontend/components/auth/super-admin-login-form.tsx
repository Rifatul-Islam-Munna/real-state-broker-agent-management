"use client"

import { useActionState, useState } from "react"
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { superAdminLoginAction, type AuthActionState } from "@/lib/auth-actions"

const initialState: AuthActionState = { error: null }

export function SuperAdminLoginForm() {
  const [state, action, pending] = useActionState(superAdminLoginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={action} className="space-y-5">
      <div className="rounded-xl border border-[#4343d5]/20 bg-[#eff4ff] p-4 text-sm text-[#29298f]">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-4" />
          Restricted platform access
        </div>
        <p className="mt-1 text-xs leading-5 text-[#464555]">
          Only authorized Super Admin accounts can sign in here.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#464555]" htmlFor="super-admin-email">
          Super Admin email
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#767586]" />
          <input
            autoComplete="email"
            className="h-14 w-full rounded-lg border border-[#c7c4d7] bg-white pl-12 pr-4 text-sm text-[#0b1c30] outline-none transition focus:border-[#4343d5] focus:ring-4 focus:ring-[#4343d5]/10"
            id="super-admin-email"
            name="email"
            required
            type="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#464555]" htmlFor="super-admin-password">
          Password
        </label>
        <div className="relative">
          <LockKeyhole className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#767586]" />
          <input
            autoComplete="current-password"
            className="h-14 w-full rounded-lg border border-[#c7c4d7] bg-white pl-12 pr-12 text-sm text-[#0b1c30] outline-none transition focus:border-[#4343d5] focus:ring-4 focus:ring-[#4343d5]/10"
            id="super-admin-password"
            name="password"
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

      {state.error ? (
        <Alert className="rounded-lg" variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <button
        className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#0b1c30] px-6 font-semibold text-white transition hover:bg-[#172d48] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Verifying..." : "Enter Super Admin portal"}
        <ArrowRight className="size-[18px]" />
      </button>
    </form>
  )
}
