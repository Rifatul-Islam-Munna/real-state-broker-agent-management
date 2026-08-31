"use client"

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { Bot, CheckCircle2, Database, FlaskConical, Gauge, KeyRound, Layers3, Route, Save, ShieldCheck, Sparkles } from "lucide-react"

import {
  testPlatformChatbotAiAction,
  updatePlatformChatbotAiAction,
  type PlatformChatbotAiSettings,
} from "@/lib/super-admin-actions"

type Props = { settings: PlatformChatbotAiSettings }

const providers: PlatformChatbotAiSettings["providerName"][] = ["OpenRouter", "OpenAI", "Gemini", "Claude", "Ollama", "Custom"]

export function ChatbotAiSettingsForm({ settings }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [provider, setProvider] = useState(settings.providerName)
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl)
  const [models, setModels] = useState(settings.models.join("\n"))
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const modelCount = models
    .split(/[\n,;]+/)
    .map((item) => item.trim().replace(/^[\s,;.'"`]+|[\s,;.'"`]+$/g, ""))
    .filter(Boolean).length

  const run = (task: () => Promise<void>) => {
    setError("")
    setMessage("")
    startTransition(async () => {
      try {
        await task()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "AI settings request failed.")
      }
    })
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    run(async () => {
      await updatePlatformChatbotAiAction(data)
      setMessage("AI fallback settings saved.")
    })
  }

  const test = () => {
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    run(async () => {
      await updatePlatformChatbotAiAction(data)
      const result = await testPlatformChatbotAiAction()
      setMessage(`Connected successfully · ${result.provider} · ${result.model}`)
    })
  }

  return (
    <form ref={formRef} onSubmit={save} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 text-white lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Bot className="size-6" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Grounded AI fallback</h2>
                <span className="rounded-full bg-indigo-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-200">Vercel AI SDK</span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Local Arctic + Qdrant retrieval stays first. AI is eligible only when that tenant&apos;s own minimum-confidence setting is not met, and the model receives only compact verified evidence.</p>
            </div>
          </div>
          <label className="flex w-fit items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold">
            <input defaultChecked={settings.enabled} name="enabled" type="checkbox" className="size-4 accent-indigo-400" />
            AI fallback enabled
          </label>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <FlowStep icon={Gauge} title="1 · Tenant confidence" body="Use the tenant threshold" />
          <FlowStep icon={Route} title="2 · AI SDK" body="Render only retrieved facts" />
          <FlowStep icon={Database} title="3 · Review & learn" body="Approve before local reuse" />
        </div>
      </div>

      <div className="space-y-7 p-6 lg:p-7">
        <section>
          <SectionHeading icon={KeyRound} title="Provider & credentials" detail="Official providers use their AI SDK defaults. Base URL is only an override; Custom requires one." />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Field label="Provider">
              <select name="providerName" value={provider} onChange={(event) => { const next = event.target.value as PlatformChatbotAiSettings["providerName"]; if (next !== provider) setBaseUrl(""); setProvider(next) }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50">
                {providers.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label={provider === "Custom" ? "Custom provider base URL · required" : "Base URL override · optional"}>
              <input name="baseUrl" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" placeholder={provider === "Custom" ? "https://your-provider.example/v1" : "Leave blank to use the provider SDK default"} />
            </Field>
            <Field label="API key">
              <div className="relative">
                <input name="apiKey" type="password" autoComplete="new-password" className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-28 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" placeholder={settings.apiKeyConfigured ? "Configured — leave blank to keep" : provider === "Ollama" ? "Optional for local Ollama" : "Paste provider API key"} />
                <span className={`absolute right-2 top-2 rounded-lg px-2 py-1 text-[10px] font-semibold ${settings.apiKeyConfigured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{settings.apiKeyConfigured ? "Stored" : "Not set"}</span>
              </div>
            </Field>
            <label className="flex items-center gap-3 self-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input name="clearApiKey" type="checkbox" className="size-4" /> Clear encrypted API key on save
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeading icon={Layers3} title="Model fallback chain" detail={provider === "OpenRouter" ? "Models stay in your order. OpenRouter accepts up to 3 fallbacks per request, so longer lists are automatically tried in groups of 3." : "Models are tried in order through the selected AI SDK provider."} />
            <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700">{modelCount} model{modelCount === 1 ? "" : "s"} · max 20</span>
          </div>
          <textarea name="models" value={models} onChange={(event) => setModels(event.target.value)} className="mt-4 min-h-36 w-full resize-y rounded-xl border border-indigo-100 bg-white p-4 font-mono text-xs leading-6 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/60" placeholder={"meta-llama/...:free\nqwen/...:free\ngoogle/...:free"} />
          <p className="mt-2 text-xs leading-5 text-slate-500">Enter one model ID per line, comma, or semicolon separated. Trailing commas, periods, quotes, and extra spaces are cleaned automatically. Keep the fastest/reliable model first.</p>
        </section>

        <section>
          <SectionHeading icon={Gauge} title="Runtime guardrails" detail="These control cost, latency and burst handling. The fallback confidence threshold itself stays tenant-specific." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <NumberField name="temperature" label="Temperature" value={settings.temperature} min="0.80" max="0.88" step="0.01" hint="Grounded but natural" />
            <NumberField name="maxOutputTokens" label="Max output tokens" value={settings.maxOutputTokens} min="64" max="500" step="1" hint="Keep replies compact" />
            <NumberField name="timeoutMs" label="Timeout" value={settings.timeoutMs} min="2000" max="30000" step="500" hint="Milliseconds per call" />
            <NumberField name="maxConcurrency" label="Concurrent AI calls" value={settings.maxConcurrency} min="1" max="100" step="1" hint="Extra calls wait in queue" />
          </div>
        </section>

        <section>
          <SectionHeading icon={ShieldCheck} title="Safety & learning controls" detail="The external model never replaces your verified knowledge source of truth." />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Toggle name="answerFallbackEnabled" checked={settings.answerFallbackEnabled} label="Low-confidence answers" detail="Use AI below tenant threshold" />
            <Toggle name="qualificationFallbackEnabled" checked={settings.qualificationFallbackEnabled} label="Hard human replies" detail="Interpret role/credit/income" />
            <Toggle name="reviewLearningEnabled" checked={settings.reviewLearningEnabled} label="Human review queue" detail="Never auto-train AI output" />
            <Toggle name="denyDataCollection" checked={settings.denyDataCollection} label="Provider privacy" detail="Request no data collection" />
          </div>
        </section>

        {message ? <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" />{message}</p> : null}
        {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center">
          <button disabled={isPending} type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#4343d5] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3939bd] disabled:opacity-50"><Save className="size-4" /> Save settings</button>
          <button disabled={isPending} type="button" onClick={test} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><FlaskConical className="size-4" /> Save + test provider</button>
          <span className="sm:ml-auto inline-flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="size-4 text-emerald-600" /> API key is encrypted and never returned to the browser.</span>
        </div>
      </div>
    </form>
  )
}

function FlowStep({ icon: Icon, title, body }: { icon: typeof Sparkles; title: string; body: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"><span className="flex size-8 items-center justify-center rounded-lg bg-white/10"><Icon className="size-4" /></span><div><p className="text-xs font-semibold text-white">{title}</p><p className="mt-0.5 text-[11px] text-slate-400">{body}</p></div></div>
}

function SectionHeading({ icon: Icon, title, detail }: { icon: typeof Sparkles; title: string; detail: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="size-4" /></span><div><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{detail}</p></div></div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="text-sm font-medium text-slate-700"><span className="mb-2 block">{label}</span>{children}</label>
}

function NumberField({ name, label, value, min, max, step, hint }: { name: string; label: string; value: number; min: string; max: string; step: string; hint: string }) {
  return <label className="rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700"><span>{label}</span><input name={name} defaultValue={value} min={min} max={max} step={step} type="number" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400" /><span className="mt-1.5 block text-[10px] font-normal text-slate-400">{hint}</span></label>
}

function Toggle({ name, checked, label, detail }: { name: string; checked: boolean; label: string; detail: string }) {
  return <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"><input name={name} defaultChecked={checked} type="checkbox" className="mt-0.5 size-4 accent-indigo-600" /><span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{detail}</span></span></label>
}
