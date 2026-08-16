"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { purchaseTenantAction, type AuthActionState } from "@/lib/auth-actions"

const initialState: AuthActionState = { error: null }

export function RegisterForm({ planId }: { planId: string | null }) {
  const [state, action, pending] = useActionState(purchaseTenantAction, initialState)

  return (
    <form action={action} className="space-y-5">
      <input name="planId" type="hidden" value={planId ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" placeholder="Blue Horizon Realty" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="requestedSubdomain">Preferred subdomain</Label>
        <Input id="requestedSubdomain" name="requestedSubdomain" placeholder="blue-horizon" />
        <p className="text-xs text-muted-foreground">Leave blank to generate it from the business name.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="firstName">Owner first name</Label><Input id="firstName" name="firstName" required /></div>
        <div className="space-y-2"><Label htmlFor="lastName">Owner last name</Label><Input id="lastName" name="lastName" required /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" required type="email" /></div>
        <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" /></div>
      </div>

      <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" minLength={8} required type="password" /></div>
      {!planId ? <Alert variant="destructive"><AlertDescription>Select a plan from the pricing page before continuing.</AlertDescription></Alert> : null}
      {state.error ? <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert> : null}

      <Button className="w-full" disabled={pending || !planId} size="lg" type="submit">
        {pending ? "Opening Stripe checkout..." : "Continue to secure payment"}
      </Button>

      <Separator />
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link className="font-semibold text-primary hover:underline" href="/login">Sign in</Link></p>
    </form>
  )
}
