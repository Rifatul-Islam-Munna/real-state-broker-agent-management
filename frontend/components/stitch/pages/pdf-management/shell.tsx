"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function PdfShell({
  children,
  description,
  title,
  action,
  fullBleed = false,
}: {
  children: React.ReactNode
  description: string
  title: string
  action?: React.ReactNode
  fullBleed?: boolean
}) {
  const pathname = usePathname()
  const tabs = [
    { href: "/dashboard/pdfs/templates", label: "Templates", icon: "edit_document" },
    { href: "/dashboard/pdfs/download", label: "Generate & download", icon: "picture_as_pdf" },
  ]

  if (fullBleed) {
    return <main className="min-h-[calc(100dvh-65px)] bg-muted/20">{children}</main>
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><AppIcon name="picture_as_pdf" /></span>
                <Badge variant="outline">pdfme</Badge>
              </div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="max-w-3xl">{description}</CardDescription>
            </div>
            {action}
          </CardHeader>
          <CardContent>
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
                return (
                  <Button key={tab.href} render={<Link href={tab.href} />} size="sm" variant={active ? "default" : "outline"}>
                    <AppIcon name={tab.icon} />
                    {tab.label}
                  </Button>
                )
              })}
            </nav>
          </CardContent>
        </Card>
        {children}
      </div>
    </main>
  )
}
