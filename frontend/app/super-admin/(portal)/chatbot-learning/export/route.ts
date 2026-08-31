import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const apiBase = (process.env.BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "")

export async function GET() {
  const token = (await cookies()).get("access_token")?.value
  if (!token) return NextResponse.json({ message: "Authentication required" }, { status: 401 })
  const response = await fetch(`${apiBase}/super-admin-management/chatbot-learning/export`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  const text = await response.text()
  if (!response.ok) {
    return new NextResponse(text || JSON.stringify({ message: "Could not export chatbot learning" }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    })
  }
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="chatbot-learning-pack-${date}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
