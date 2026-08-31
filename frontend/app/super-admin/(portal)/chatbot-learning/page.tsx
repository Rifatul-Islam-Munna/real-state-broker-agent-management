import Link from "next/link"
import { BrainCircuit, Check, DatabaseBackup, Download, Filter, Gauge, ShieldCheck, Sparkles, Upload, X } from "lucide-react"

import {
  approvePlatformChatbotLearningAction,
  getPlatformChatbotAiSettings,
  getPlatformChatbotLearning,
  importPlatformChatbotLearningAction,
  rejectPlatformChatbotLearningAction,
} from "@/lib/super-admin-actions"
import { ChatbotAiSettingsForm } from "./chatbot-ai-settings-form"
import { SelectAllLearningRows } from "./select-all-learning-rows"

type Props = {
  searchParams: Promise<{ status?: string; kind?: string; tenantId?: string; page?: string }>
}

export default async function ChatbotLearningPage({ searchParams }: Props) {
  const filters = await searchParams
  const effectiveFilters = { ...filters, status: filters.status === undefined ? "PENDING" : filters.status }
  const [settings, learning] = await Promise.all([
    getPlatformChatbotAiSettings(),
    getPlatformChatbotLearning(effectiveFilters),
  ])
  const totalPages = Math.max(1, Math.ceil(learning.total / learning.pageSize))
  const pageHref = (page: number) => {
    const params = new URLSearchParams()
    if (effectiveFilters.status) params.set("status", effectiveFilters.status)
    if (effectiveFilters.kind) params.set("kind", effectiveFilters.kind)
    if (effectiveFilters.tenantId) params.set("tenantId", effectiveFilters.tenantId)
    params.set("page", String(page))
    return `/super-admin/chatbot-learning?${params.toString()}`
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-7">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600"><Sparkles className="size-3.5" /> Grounded intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#101828]">AI fallback & self-learning</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">Local knowledge stays first. AI is used only below each tenant&apos;s configured confidence threshold, only with retrieved evidence, and every learned result stays reviewable before local reuse.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/super-admin/chatbot-learning/export" className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm"><Download className="size-4" /> Download learned pack</a>
            <Link href="/super-admin/chatbot-knowledge" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"><DatabaseBackup className="size-4" /> Verified knowledge</Link>
          </div>
        </div>
        <div className="grid border-t border-slate-100 bg-slate-50/70 sm:grid-cols-3">
          <HeaderFact icon={Gauge} title="Tenant controlled" detail="Minimum confidence decides fallback" />
          <HeaderFact icon={ShieldCheck} title="Evidence only" detail="No free-form outside knowledge" />
          <HeaderFact icon={BrainCircuit} title="Human approved" detail="Learning stays reviewable" />
        </div>
      </header>

      <ChatbotAiSettingsForm settings={settings} />

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Pending review" value={learning.counts.pending} detail="AI outputs waiting for a human decision" />
        <Metric label="Approved" value={learning.counts.approved} detail="Reusable local knowledge or reply patterns" />
        <Metric label="Rejected" value={learning.counts.rejected} detail="Kept out of chatbot learning" />
      </section>

      <section className="rounded-2xl border border-[#e1e6ef] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-[#101828]"><BrainCircuit className="size-5 text-indigo-600" /> Human review queue</h2>
            <p className="mt-1 text-sm text-slate-500">Repeated identical outputs are compacted into one row with an occurrence counter instead of storing every message copy.</p>
          </div>
          <form className="flex flex-wrap gap-2" method="get">
            <Filter className="mt-3 size-4 text-slate-400" />
            <select name="status" defaultValue={effectiveFilters.status} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
            </select>
            <select name="kind" defaultValue={filters.kind ?? ""} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="">All learning</option><option value="ANSWER">Answers</option><option value="QUALIFICATION">Human replies</option>
            </select>
            <input name="tenantId" defaultValue={filters.tenantId ?? ""} inputMode="numeric" placeholder="Tenant ID" className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-sm" />
            <button className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white" type="submit">Filter</button>
          </form>
        </div>

        <form className="mt-5" action={approvePlatformChatbotLearningAction}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">Showing {learning.items.length} of {learning.total}. Select any rows, then approve or reject in bulk.</p>
            <div className="flex gap-2">
              <button formAction={rejectPlatformChatbotLearningAction} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700" type="submit"><X className="size-3.5" /> Reject selected</button>
              <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white" type="submit"><Check className="size-3.5" /> Approve selected</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="w-12 p-3"><SelectAllLearningRows /></th><th className="p-3">Tenant / context</th><th className="min-w-[300px] p-3">Human message</th><th className="min-w-[320px] p-3">AI output / interpretation</th><th className="p-3">Source</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {learning.items.length ? learning.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="p-3"><input aria-label={`Select ${item.id}`} data-chatbot-learning-row="true" name="ids" value={item.id} type="checkbox" className="size-4" /></td>
                    <td className="p-3 text-xs text-slate-600"><p className="font-semibold text-slate-800">{item.tenantName || `Tenant #${item.tenantId}`}</p><p className="mt-1">#{item.tenantId} · {item.audience} · {item.channel}</p><p className="mt-1">{item.propertyTitle || (item.propertyId ? `Property #${item.propertyId}` : "Tenant-wide")}</p><p className="mt-1 font-semibold text-indigo-600">{item.kind === "ANSWER" ? "Answer" : "Human reply pattern"}</p></td>
                    <td className="p-3"><p className="whitespace-pre-wrap leading-6 text-slate-800">{item.question}</p><p className="mt-2 text-xs text-slate-400">Seen {item.occurrences.toLocaleString()} time{item.occurrences === 1 ? "" : "s"}</p></td>
                    <td className="p-3"><p className="whitespace-pre-wrap leading-6 text-slate-700">{item.answer}</p>{item.structuredPayload ? <pre className="mt-2 max-w-lg overflow-auto rounded bg-slate-50 p-2 text-[10px] text-slate-500">{JSON.stringify(item.structuredPayload)}</pre> : null}</td>
                    <td className="p-3 text-xs text-slate-500"><p className="font-medium text-slate-700">{item.provider || "AI"}</p><p className="mt-1 max-w-48 break-all">{item.model || "—"}</p><p className="mt-1">Confidence {item.confidence == null ? "—" : `${Math.round(item.confidence * 100)}%`}</p></td>
                    <td className="p-3"><Status value={item.status} /></td>
                  </tr>
                )) : <tr><td colSpan={6} className="p-12 text-center text-sm text-slate-500">No learning candidates match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">Page {learning.page} of {totalPages}</span>
            <div className="flex gap-2">
              {learning.page > 1 ? <Link href={pageHref(learning.page - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">Previous</Link> : <span className="rounded-lg border border-slate-100 px-4 py-2 text-slate-300">Previous</span>}
              {learning.page < totalPages ? <Link href={pageHref(learning.page + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">Next</Link> : <span className="rounded-lg border border-slate-100 px-4 py-2 text-slate-300">Next</span>}
            </div>
          </div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 text-sm leading-6 text-indigo-950">
          <h3 className="font-semibold">How approval changes the bot</h3>
          <p className="mt-2">Approved AI answers are written into that tenant&apos;s existing chatbot knowledge and indexed with Arctic + Qdrant, so the same or semantically similar question is answered locally next time. Approved qualification examples train the reply pattern; future messages are still validated as the current visitor&apos;s role, credit, or income before qualification is updated.</p>
        </div>
        <form action={importPlatformChatbotLearningAction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Upload className="size-4" /> Restore learned pack</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">Upload a compact JSON pack downloaded from this page. It stores approved learning, not model weights or API secrets; restore re-embeds it with the current Arctic model and re-indexes Qdrant.</p>
          <input required accept="application/json,.json" type="file" name="backup" className="mt-4 block w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600" />
          <button type="submit" className="mt-4 h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Upload, approve & re-index</button>
        </form>
      </section>
    </div>
  )
}

function HeaderFact({ icon: Icon, title, detail }: { icon: typeof Sparkles; title: string; detail: string }) {
  return <div className="flex items-center gap-3 border-slate-200 px-6 py-4 sm:border-l sm:first:border-l-0"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"><Icon className="size-4" /></span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-[11px] text-slate-500">{detail}</p></div></div>
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>
}

function Status({ value }: { value: "PENDING" | "APPROVED" | "REJECTED" }) {
  const style = value === "APPROVED" ? "bg-emerald-50 text-emerald-700" : value === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}>{value}</span>
}
