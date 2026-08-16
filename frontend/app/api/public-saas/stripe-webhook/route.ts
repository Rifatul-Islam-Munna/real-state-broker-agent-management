import { NextRequest, NextResponse } from "next/server"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature")
  const contentType = request.headers.get("content-type") ?? "application/json"
  const body = await request.arrayBuffer()

  try {
    const response = await fetch(`${baseUrl}/public-saas/stripe-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        ...(signature ? { "stripe-signature": signature } : {}),
      },
      body,
      cache: "no-store",
    })
    const responseBody = await response.arrayBuffer()
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    })
  } catch {
    return NextResponse.json({ message: "Stripe webhook backend is unavailable" }, { status: 503 })
  }
}
