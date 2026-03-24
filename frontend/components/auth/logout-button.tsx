"use client"

import { useTransition } from "react"

import { logoutAction } from "@/lib/auth-actions"

export function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <button
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      onClick={() => startTransition(() => void logoutAction())}
      type="button"
    >
      {pending ? "Signing Out..." : "Sign Out"}
    </button>
  )
}
