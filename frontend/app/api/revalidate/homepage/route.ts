import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function getCurrentUserFromCookie() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value

  if (!accessToken) {
    return null
  }

  const response = await fetch(`${baseUrl}/auth/me`, {
    cache: "no-store",
    headers: {
      access_token: accessToken,
    },
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as { role: string }
}

export async function POST() {
  const currentUser = await getCurrentUserFromCookie()

  if (!currentUser || currentUser.role !== "Admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  revalidateTag("homepage-settings", "max")

  return NextResponse.json({ revalidated: true })
}
