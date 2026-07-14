"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

async function getCurrentUser() {
  const response = await fetch("/api/session-user", { cache: "no-store" })
  if (!response.ok) throw new Error("Unable to load current user")
  const user = await response.json()
  const [firstName = "", ...rest] = String(user.fullName ?? "Agent User").split(" ")
  return {
    ...user,
    id: String(user.id),
    firstName: user.firstName ?? firstName,
    lastName: user.lastName ?? rest.join(" "),
    fullName: user.fullName ?? `${firstName} ${rest.join(" ")}`.trim(),
    role: String(user.role ?? "Agent").toLowerCase() === "admin" ? "admin" : "tenant_owner",
  }
}

export function useMeQuery() {
  return useQuery({ queryKey: ["session-user"], queryFn: getCurrentUser, staleTime: 60_000 })
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      await fetch("/api/logout", { method: "POST" }).catch(() => undefined)
      window.location.href = "/login"
    },
  })
}
