"use client"

import { useState } from "react"
import { Eye, X } from "lucide-react"
import { propertyOperationsApi, type OperationsPublicAccess } from "@/lib/property-operations-api"

export function ManagerShares({ items, revoke }: { items: OperationsPublicAccess[]; revoke: (id: string) => void }) {
  const [selected, setSelected] = useState<OperationsPublicAccess | null>(null)
  const [submissions, setSubmissions] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)

  async function view(item: OperationsPublicAccess) {
    setSelected(item)
    setLoading(true)
    try { setSubmissions(await propertyOperationsApi.getSubmissions(item.id)) }
    finally { setLoading(false) }
  }

  return <>
    <div className="grid gap-3 lg:grid-cols-2">{items.map((item) => <article className="rounded-2xl border p-4" key={item.id}>
      <div className="flex justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.propertyTitle} · {item.moduleKey}</p></div><span className="rounded-full border px-2 py-1 text-xs">{item.status}</span></div>
      <p className="mt-3 text-xs text-muted-foreground">{item.recipientName || item.recipientLabel} · Uses {item.useCount}/{item.maxUses} · {item.submissionCount ?? 0} responses</p>
      <div className="mt-3 flex gap-2"><button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" onClick={() => void view(item)} type="button"><Eye className="size-4" />Responses</button>{item.status === "Active" ? <button className="rounded-lg border px-3 py-2 text-xs text-red-600" onClick={() => revoke(item.id)} type="button">Revoke</button> : null}</div>
    </article>)}{!items.length ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No shared forms yet.</p> : null}</div>
    {selected ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-background p-5 md:rounded-3xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">{selected.title}</h2><p className="text-xs text-muted-foreground">Anonymous and external responses</p></div><button onClick={() => setSelected(null)} type="button"><X /></button></div><div className="mt-5 space-y-3">{loading ? <p className="text-sm text-muted-foreground">Loading responses...</p> : submissions.map((item, index) => <article className="rounded-2xl border p-4" key={String(item._id ?? item.id ?? index)}><p className="font-semibold">{String(item.responderName ?? "Anonymous responder")}</p><p className="mt-1 text-xs text-muted-foreground">{String(item.responderEmail ?? "")} {String(item.responderPhone ?? "")}</p><pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-xs">{JSON.stringify(item.response ?? {}, null, 2)}</pre></article>)}{!loading && !submissions.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No responses yet.</p> : null}</div></div></div> : null}
  </>
}
