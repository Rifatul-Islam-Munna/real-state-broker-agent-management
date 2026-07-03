"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { registerAction, type AuthActionState } from "@/lib/auth-actions"

const initialState: AuthActionState = { error: null }

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState)

  return (
    <form action={action} className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/35 p-3">
        <div>
          <p className="text-sm font-semibold">{"Agent account"}</p>
          <p className="text-xs text-muted-foreground">
            {"Administrator accounts are managed inside the secured workspace."}
          </p>
        </div>
        <Badge variant="secondary">{"Agent"}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">{"First name"}</Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="Rifat"
            required
            type="text"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{"Last name"}</Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Islam"
            required
            type="text"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">{"Email address"}</Label>
          <Input
            id="email"
            name="email"
            placeholder="agent@estateblue.com"
            required
            type="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{"Phone"}</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+880 1XXX XXXXXX"
            type="tel"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{"Password"}</Label>
        <Input
          id="password"
          name="password"
          placeholder="Choose a secure password"
          required
          type="password"
        />
        <p className="text-xs text-muted-foreground">{"Use at least 6 characters."}</p>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending ? "Creating agent account..." : "Create agent account"}
      </Button>

      <Separator />

      <p className="text-center text-sm text-muted-foreground">
        {"Already have an account? "}
        <Link className="font-semibold text-primary hover:underline" href="/login">
          {"Sign in"}
        </Link>
      </p>
    </form>
  )
}
