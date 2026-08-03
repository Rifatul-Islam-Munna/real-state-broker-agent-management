import { getAuditLogs } from "@/lib/super-admin-actions"

type Log = { id:number; action:string; entityType:string; entityId:number|null; actorUserId:number|null; summary:string; createdAt:string }

export default async function ActivityPage() {
  const logs = await getAuditLogs() as Log[]
  return <div className="mx-auto max-w-5xl space-y-8"><header><h1 className="text-3xl font-bold">Activity and audit log</h1><p className="mt-2 text-sm text-[#646273]">Important plan, tenant, subscription, and administrative updates.</p></header><div className="space-y-3">{logs.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-[#646273]">No administrative activity yet.</div> : logs.map(log => <article className="rounded-2xl border bg-white p-5 shadow-sm" key={log.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{log.summary}</p><p className="mt-1 text-xs text-[#646273]">{log.action} · {log.entityType}{log.entityId ? ` #${log.entityId}` : ""} · actor #{log.actorUserId ?? "system"}</p></div><time className="text-xs text-[#646273]">{new Date(log.createdAt).toLocaleString()}</time></div></article>)}</div></div>
}
