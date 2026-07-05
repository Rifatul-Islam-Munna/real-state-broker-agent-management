"use client"

import { useEffect, useState } from "react"
import { opsStatus, type PublicRecordStatus } from "@/lib/ops-status"

export function PublicStatusPanel({ token }: { token: string }) {
  const [item, setItem] = useState<PublicRecordStatus | null>(null)
  const [status, setStatus] = useState("")
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")
  useEffect(() => { opsStatus.get(token).then((v) => { setItem(v); setStatus(v.status) }).catch(() => undefined) }, [token])
  if (!item) return null
  const save = async () => { try { setItem(await opsStatus.update(token, { status, comment })); setComment("") } catch (e) { setError(e instanceof Error ? e.message : "Update failed") } }
  return <section className="rounded-2xl border p-4"><div className="flex justify-between gap-3"><div><p className="text-xs text-muted-foreground">Linked {item.recordType}</p><h2 className="font-semibold">{item.title}</h2></div><span className="rounded-full border px-2 py-1 text-xs">{item.status}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><select className="h-10 rounded-xl border px-3" value={status} onChange={(e) => setStatus(e.target.value)}>{["Open", "In progress", "Waiting", "Resolved", "Completed"].map((v) => <option key={v}>{v}</option>)}</select><input className="h-10 rounded-xl border px-3" placeholder="Progress comment" value={comment} onChange={(e) => setComment(e.target.value)} /></div>{error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}<button className="mt-3 h-10 w-full rounded-xl border font-semibold" onClick={() => void save()} type="button">Update progress</button></section>
}
