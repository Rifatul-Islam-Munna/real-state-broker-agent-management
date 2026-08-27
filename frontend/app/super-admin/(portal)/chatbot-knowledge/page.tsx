import { BookOpenCheck, Pencil, RefreshCw, ShieldCheck, Sparkles, Trash2 } from "lucide-react"

import {
  createPlatformChatbotKnowledgeAction,
  deletePlatformChatbotKnowledgeAction,
  getPlatformChatbotKnowledge,
  reindexPlatformChatbotKnowledgeAction,
  setPlatformChatbotKnowledgeStatusAction,
  updatePlatformChatbotKnowledgeAction,
} from "@/lib/super-admin-actions"

export default async function PlatformChatbotKnowledgePage() {
  const knowledge = await getPlatformChatbotKnowledge()

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Shared intelligence
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#101828]">
            Platform chatbot knowledge
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Publish verified answers for every tenant. Evidence stays separated by lead and realtor audience.
          </p>
        </div>
        <form action={reindexPlatformChatbotKnowledgeAction}>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" type="submit">
            <RefreshCw className="size-4" /> Reindex platform knowledge
          </button>
        </form>
      </header>
      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form action={createPlatformChatbotKnowledgeAction} className="h-fit space-y-5 rounded-2xl border border-[#e1e6ef] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#101828]">Add verified answer</h2>
              <p className="text-xs text-slate-500">Indexed in Qdrant after saving.</p>
            </div>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Audience
            <select className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3" name="audience" defaultValue="LEAD">
              <option value="LEAD">Lead</option>
              <option value="REALTOR">Realtor only</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Title
            <input className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" name="title" required maxLength={240} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Verified answer
            <textarea className="mt-2 min-h-32 w-full rounded-lg border border-slate-200 p-3" name="answer" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Main question
            <input className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" name="mainQuestion" required placeholder="Can I park my car?" />
            <span className="mt-1 block text-xs font-normal text-slate-500">The clearest version of the question this answer should handle.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Similar ways people may ask
            <textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 p-3" name="similarQuestions" placeholder={"Is parking included?\nWhere do I park?\nCan I park an SUV?\nDo I get guest parking?"} />
            <span className="mt-1 block text-xs font-normal text-slate-500">One phrase per line. Add short wording, slang, typos, and natural variations.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Priority
            <input className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" name="priority" type="number" min={0} max={100} defaultValue={50} />
          </label>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4343d5] px-4 text-sm font-semibold text-white transition hover:bg-[#3838bd]" type="submit">
            <BookOpenCheck className="size-4" /> Save and index
          </button>
        </form>

        <div className="space-y-3">
          {knowledge.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-slate-500">
              No platform knowledge yet.
            </div>
          ) : knowledge.map((item) => (
            <article className="rounded-2xl border border-[#e1e6ef] bg-white p-5 shadow-sm" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-[#101828]">{item.title}</h2>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{item.audience}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{item.indexStatus}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  <ShieldCheck className="size-3.5" /> {item.active ? "Active" : "Inactive"}
                </span>
              </div>
              {item.lastError ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">Index error: {item.lastError}</p> : null}
              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700">
                  <Pencil className="size-4" /> Edit verified knowledge
                </summary>
                <form action={updatePlatformChatbotKnowledgeAction} className="mt-4 grid gap-3">
                  <input name="id" type="hidden" value={item.id} />
                  <input name="active" type="hidden" value={item.active ? "true" : "false"} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-600">Audience
                      <select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" defaultValue={item.audience} name="audience">
                        <option value="LEAD">Lead</option><option value="REALTOR">Realtor only</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Priority
                      <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" defaultValue={item.priority} max={100} min={0} name="priority" type="number" />
                    </label>
                  </div>
                  <label className="text-xs font-semibold text-slate-600">Title
                    <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" defaultValue={item.title} maxLength={240} name="title" required />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Verified answer
                    <textarea className="mt-1 min-h-28 w-full rounded-lg border border-slate-200 bg-white p-3" defaultValue={item.answer} name="answer" required />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Main question
                    <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3" defaultValue={item.questionExamples?.[0] ?? ""} name="mainQuestion" />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">Similar ways people may ask
                    <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 bg-white p-3" defaultValue={(item.questionExamples ?? []).slice(1).join("\n")} name="similarQuestions" placeholder="One similar phrase per line" />
                  </label>
                  <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4343d5] px-4 text-xs font-semibold text-white" type="submit"><BookOpenCheck className="size-3.5" /> Save and reindex</button>
                </form>
              </details>
              <div className="mt-5 flex items-center gap-2 border-t pt-4">
                <form action={setPlatformChatbotKnowledgeStatusAction}>
                  <input name="id" type="hidden" value={item.id} />
                  <input name="active" type="hidden" value={item.active ? "false" : "true"} />
                  <button className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-700" type="submit">{item.active ? "Disable" : "Enable"}</button>
                </form>
                <form action={deletePlatformChatbotKnowledgeAction} className="ml-auto">
                  <input name="id" type="hidden" value={item.id} />
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700" type="submit">
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
