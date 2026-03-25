"use client"

import { AdminDashboardPage } from "@/components/stitch/pages/admin-dashboard/page"

type DashboardApiPageProps = {
  currentUserName: string
  portal: "admin" | "agent"
}

export function DashboardApiPage({ currentUserName, portal }: DashboardApiPageProps) {
  return (
    <AdminDashboardPage
      currentUserName={currentUserName}
      portal={portal}
    />
  )
}
