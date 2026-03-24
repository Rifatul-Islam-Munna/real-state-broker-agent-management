import { NextResponse } from "next/server"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

export const dynamic = "force-dynamic"

async function forwardResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "application/json"
  const body = await response.text()

  return new NextResponse(body, {
    headers: {
      "content-type": contentType,
    },
    status: response.status,
  })
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("File")
  const folder = formData.get("Folder")

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file was provided." }, { status: 400 })
  }

  const payload = new FormData()
  payload.set("File", file)
  payload.set("Folder", typeof folder === "string" && folder.trim().length > 0 ? folder : "properties")

  const response = await fetch(`${baseUrl}/upload`, {
    body: payload,
    cache: "no-store",
    method: "POST",
  })

  return forwardResponse(response)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const objectName = searchParams.get("objectName") ?? searchParams.get("ObjectName")

  if (!objectName) {
    return NextResponse.json({ message: "Object name is required." }, { status: 400 })
  }

  const response = await fetch(`${baseUrl}/upload?ObjectName=${encodeURIComponent(objectName)}`, {
    cache: "no-store",
    method: "DELETE",
  })

  return forwardResponse(response)
}
