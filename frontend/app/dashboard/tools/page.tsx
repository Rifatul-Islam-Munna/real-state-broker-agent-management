import Link from "next/link"
import { ArrowRight, Calculator, FilePenLine, Sparkles, StickyNote, Wrench } from "lucide-react"

const tools = [
  {
    href: "/dashboard/tools/pdf-editor",
    title: "PDF Editor",
    description: "Upload an existing PDF, place fields and content, then export a finished copy.",
    icon: FilePenLine,
    eyebrow: "Document workflow",
  },
  {
    href: "/dashboard/tools/sticky-notes",
    title: "Sticky Notes",
    description: "Create a draggable workspace for client requests, property details, and follow-ups.",
    icon: StickyNote,
    eyebrow: "Personal workspace",
  },
  {
    href: "/dashboard/tools/calculators",
    title: "Real-estate Calculators",
    description: "Estimate commission splits, agent net earnings, and seller proceeds in seconds.",
    icon: Calculator,
    eyebrow: "Financial utilities",
  },
]

export default function ToolsPage() {
  return (
    <main className="min-h-full bg-[#f8f9ff] px-4 py-6 text-[#0b1c30] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#4343d5]">
              <Wrench className="size-4" /> Workspace utilities
            </div>
            <h1 className="text-[36px] font-bold leading-tight tracking-[-0.03em]">Tools Center</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#464555]">
              Practical utilities for agents and real-estate teams, organized in one focused workspace.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[#c7c4d7] bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#e1e0ff] text-[#4343d5]">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4343d5]">Ready to use</p>
              <p className="text-xs text-[#464555]">{tools.length} workspace tools available</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {tools.map(({ href, title, description, icon: Icon, eyebrow }) => (
            <Link
              className="group relative overflow-hidden rounded-[24px] border border-[#c7c4d7] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition duration-200 hover:-translate-y-1 hover:border-[#4343d5]/40 hover:shadow-[0_12px_30px_rgba(67,67,213,0.10)]"
              href={href}
              key={href}
            >
              <div className="mb-10 flex items-start justify-between gap-4">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-[#eff0ff] text-[#4343d5] transition group-hover:bg-[#4343d5] group-hover:text-white">
                  <Icon className="size-6" />
                </span>
                <span className="flex size-9 items-center justify-center rounded-full border border-[#c7c4d7] text-[#464555] transition group-hover:border-[#4343d5] group-hover:bg-[#4343d5] group-hover:text-white">
                  <ArrowRight className="size-4" />
                </span>
              </div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#4343d5]">{eyebrow}</p>
              <h2 className="text-xl font-bold tracking-[-0.02em]">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#464555]">{description}</p>
              <div className="pointer-events-none absolute -bottom-16 -right-16 size-40 rounded-full bg-[#e1e0ff]/45 blur-2xl transition group-hover:bg-[#c1c1ff]/60" />
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
