"use client"

import Link from "next/link"
import { useActionState, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { registerAction, type AuthActionState } from "@/lib/auth-actions"

const initialState: AuthActionState = { error: null }

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState)
  const [role, setRole] = useState("Admin")

  return (
    <form action={action} className="space-y-5">
      <input name="role" type="hidden" value={role} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">{"First name"}</Label>
          <Input id="firstName" name="firstName" placeholder="Estate" required type="text" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{"Last name"}</Label>
          <Input id="lastName" name="lastName" placeholder="Admin" required type="text" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">{"Email address"}</Label>
          <Input id="email" name="email" placeholder="admin@estateblue.com" required type="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{"Phone"}</Label>
          <Input id="phone" name="phone" placeholder="+1 555 000 0000" type="tel" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">{"Password"}</Label>
          <Input id="password" name="password" placeholder="Choose a secure password" required type="password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">{"Role"}</Label>
          <Select modal={false} onValueChange={(value) => setRole(value ?? "Admin")} value={role}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">{"Admin"}</SelectItem>
              <SelectItem value="Agent">{"Agent"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending ? "Creating account..." : "Create account"}
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
