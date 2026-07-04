"use client"

import Link from "next/link"
import type { LeadCollectionTemplateItem } from "@/@types/lead-collection-template"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function TemplateRegistryItem({
  item,
  busy,
  onToggle,
  onCopy,
  onRemove,
}: {
  item: LeadCollectionTemplateItem
  busy: boolean
  onToggle: () => void
  onCopy: () => void
  onRemove: () => void
}) {
  const linked = item.linkedPageConfig?.enabled
  return (
    <article className="flex min-h-[20rem] flex-col rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{item.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.providerName || "Custom provider"}
          </p>
        </div>
        <Badge variant={item.isActive ? "default" : "outline"}>
          {item.isActive ? "Active" : "Paused"}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {item.description || item.sampleSubject || "No description"}
      </p>
      <div className="mt-4 space-y-2 rounded-lg bg-muted/30 p-3 text-xs">
        <DataRow label="Fields" value={String(item.mappings.length)} />
        <DataRow label="Matches" value={String(item.matchCount)} />
        <DataRow label="Subject" value={item.subjectPattern || "Any"} />
        <DataRow
          label="Detail page"
          value={linked ? item.linkedPageConfig.allowedHosts.join(", ") : "Email only"}
        />
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button
          render={<Link href={`/dashboard/lead-collection-templates/${item.id}`} />}
          size="sm"
          variant="outline"
        >
          Edit
        </Button>
        <Button disabled={busy} onClick={onCopy} size="sm" variant="outline">
          Copy
        </Button>
        <Button disabled={busy} onClick={onToggle} size="sm" variant="ghost">
          {item.isActive ? "Pause" : "Activate"}
        </Button>
        <Button disabled={busy} onClick={onRemove} size="sm" variant="ghost">
          Remove
        </Button>
      </div>
    </article>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium" title={value}>{value}</span>
    </div>
  )
}
