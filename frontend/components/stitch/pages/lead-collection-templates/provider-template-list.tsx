"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLeadCollectionTemplates } from "@/hooks/use-lead-collection-templates"

export function ProviderTemplateList() {
  const [search, setSearch] = useState("")
  const query = useLeadCollectionTemplates({ page: 1, pageSize: 200, search })
  const templates = query.data?.items ?? []

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black">Lead collection templates</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Create one template for each provider. Detail-page templates can collect information that is behind a link in the email.
          </p>
        </div>
        <div className="flex gap-2">
          <Button render={<Link href="/dashboard/lead-collection-templates/new?preset=zillow" />}>Zillow template</Button>
          <Button render={<Link href="/dashboard/lead-collection-templates/new" />} variant="outline">Other provider</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured providers</CardTitle>
          <CardDescription>{templates.length} templates</CardDescription>
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" value={search} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {templates.map((item) => (
              <article className="rounded-xl border p-4" key={item.id}>
                <h2 className="font-bold">{item.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.providerName || "Custom provider"}</p>
                <p className="mt-3 text-sm">{item.linkedPageConfig?.enabled ? `Detail page: ${item.linkedPageConfig.allowedHosts.join(", ")}` : "Email-only parser"}</p>
                <Button className="mt-4" render={<Link href={`/dashboard/lead-collection-templates/${item.id}`} />} size="sm" variant="outline">Edit</Button>
              </article>
            ))}
          </div>
          {!query.isLoading && templates.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No templates found.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
