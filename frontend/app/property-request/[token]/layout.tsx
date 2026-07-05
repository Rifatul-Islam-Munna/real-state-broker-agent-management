import type { ReactNode } from "react"
import { PublicStatusPanel } from "@/components/property-operations/public-status-panel"

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ token: string }> }) {
  const { token } = await params
  return <>
    <div className="mx-auto max-w-3xl bg-muted/20 px-4 pt-4 md:px-8 md:pt-8">
      <PublicStatusPanel token={token} />
    </div>
    {children}
  </>
}
