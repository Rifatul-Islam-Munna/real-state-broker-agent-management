"use client"

import type { OperationsPublicAccess } from "@/lib/property-operations-api"

export function ManagerShares({ items, revoke }: { items: OperationsPublicAccess[]; revoke: (id: number) => void }) {
  return <div className="grid gap-3 lg:grid-cols-2">{items.map((item) => <article className="rounded-2xl border p-4" key={item.id}><div className="flex justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.propertyTitle}</p></div><span className="text-xs">{item.status}</span></div><p className="mt-3 text-xs text-muted-foreground">Uses {item.useCount}/{item.maxUses}</p><div className="mt-3 flex gap-2">{item.publicUrl ? <a className="rounded-lg border px-3 py-2 text-xs" href={item.publicUrl} target="_blank">Open</a> : null}{item.status === "Active" ? <button className="rounded-lg border px-3 py-2 text-xs text-red-600" onClick={() => revoke(item.id)} type="button">Revoke</button> : null}</div></article>)}{!items.length ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No shared forms yet.</p> : null}</div>
}
