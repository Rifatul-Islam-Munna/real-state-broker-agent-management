"use client"

import { useTransition } from "react"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/auth-actions"

export function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() => startTransition(() => void logoutAction())}
      type="button"
      variant="outline"
    >
      <LogOut />
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  )
}
