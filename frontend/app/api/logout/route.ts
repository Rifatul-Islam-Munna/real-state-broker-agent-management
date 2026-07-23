import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set("access_token", "", { expires: new Date(0), path: "/" })
  response.cookies.set("refresh_token", "", { expires: new Date(0), path: "/" })
  response.cookies.set("user_role", "", { expires: new Date(0), path: "/" })

  return response
}
