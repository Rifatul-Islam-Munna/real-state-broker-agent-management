import type { Metadata } from "next"
import { NestPublicRequestForm } from "@/components/property-operations/nest-public-request-form"

export const metadata: Metadata = { title: "Property Request" }

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <NestPublicRequestForm token={token} />
}
