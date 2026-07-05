import type { Metadata } from "next"
import { PublicRequestForm } from "@/components/property-operations/public-request-form"

export const metadata: Metadata = { title: "Property Request" }

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PublicRequestForm token={token} />
}
