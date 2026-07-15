import Link from "next/link"
import { Calculator, FilePenLine, StickyNote } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const tools = [
  { href: "/dashboard/tools/pdf-editor", title: "PDF Editor", description: "Upload and edit an existing PDF, then download the finished document.", icon: FilePenLine },
  { href: "/dashboard/tools/sticky-notes", title: "Sticky Notes", description: "Keep draggable notes that are saved to your account and available later.", icon: StickyNote },
  { href: "/dashboard/tools/calculators", title: "Real-estate Calculators", description: "Estimate commission splits and seller net proceeds.", icon: Calculator },
]

export default function ToolsPage() {
  return <div className="space-y-6 p-4 md:p-6">
    <div><h1 className="text-3xl font-bold tracking-tight">Tools</h1><p className="mt-1 text-muted-foreground">Practical utilities for agents and real-estate teams.</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tools.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href}>
        <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader><Icon className="mb-3 size-8"/><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>
      </Link>)}
    </div>
  </div>
}
