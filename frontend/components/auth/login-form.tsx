"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
        <Alert>
          <AlertDescription>{"Sign in and return to your requested page."}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">{"Email address"}</Label>
        <Input id="email" name="email" placeholder="admin@estateblue.com" required type="email" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">{"Password"}</Label>
          <span className="text-xs text-muted-foreground">{"Minimum 6 characters"}</span>
        </div>
        <Input id="password" name="password" placeholder="Enter your password" required type="password" />
      </div>
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <Separator />
      <p className="text-center text-sm text-muted-foreground">
        {"Need a workspace account? "}
        <Link className="font-semibold text-primary hover:underline" href="/register">
          {"Create account"}
        </Link>
      </p>
    </form>
  )
}
