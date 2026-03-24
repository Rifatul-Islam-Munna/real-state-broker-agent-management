export type UploadedAsset = {
  objectName: string
  url: string
  sizeBytes: number
  mimeType: string
}

type ErrorPayload = {
  message?: string | { message?: string | string[] }
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const message = (payload as ErrorPayload).message

  if (typeof message === "string") {
    return message
  }

  if (message && typeof message === "object") {
    if (Array.isArray(message.message) && message.message[0]) {
      return message.message[0]
    }

    if (typeof message.message === "string") {
      return message.message
    }
  }

  return fallback
}

async function parseJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function uploadPropertyAsset(file: File, folder: string) {
  const formData = new FormData()
  formData.set("File", file)
  formData.set("Folder", folder)

  const response = await fetch("/api/upload", {
    body: formData,
    method: "POST",
  })

  const payload = await parseJson(response)

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "Failed to upload file."))
  }

  return payload as UploadedAsset
}

export async function deleteUploadedAsset(objectName: string) {
  const response = await fetch(`/api/upload?ObjectName=${encodeURIComponent(objectName)}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const payload = await parseJson(response)
    throw new Error(extractErrorMessage(payload, "Failed to delete file."))
  }
}
