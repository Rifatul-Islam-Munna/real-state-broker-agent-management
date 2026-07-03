export type ApiError = {
  message: string
  statusCode: number
}

const proxyBaseUrl = "/api/proxy"

function extractValidationMessage(errors: unknown): string | null {
  if (!errors) return null

  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (typeof item === "string" && item.trim().length > 0) return item

      const nestedMessage = extractValidationMessage(item)
      if (nestedMessage) return nestedMessage
    }

    return null
  }

  if (typeof errors === "object") {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      const nestedMessage = extractValidationMessage(value)
      if (nestedMessage) return nestedMessage
    }
  }

  if (typeof errors === "string" && errors.trim().length > 0) {
    return errors
  }

  return null
}

function extractErrorMessage(payload: unknown, fallback = "Something went wrong"): string {
  if (!payload) return fallback
  if (typeof payload === "string") return payload.trim() || fallback
  if (typeof payload !== "object") return fallback

  const record = payload as Record<string, unknown>
  const message = record.message

  if (typeof message === "string" && message.trim().length > 0) {
    return message
  }

  if (Array.isArray(message)) {
    const firstMessage = message.find(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    )
    if (firstMessage) return firstMessage
  }

  if (message && typeof message === "object") {
    const nestedMessage = extractErrorMessage(message, "")
    if (nestedMessage) return nestedMessage
  }

  if (typeof record.detail === "string" && record.detail.trim().length > 0) {
    return record.detail
  }

  const validationMessage = extractValidationMessage(record.errors)
  if (validationMessage) return validationMessage

  if (typeof record.title === "string" && record.title.trim().length > 0) {
    return record.title
  }

  return fallback
}

function getFallbackMessage(statusCode: number) {
  if (statusCode === 404) return "Data not found."
  return `Request failed with status ${statusCode}`
}

function extractStatusCode(payload: unknown, fallback = 500): number {
  if (!payload || typeof payload !== "object") return fallback

  const record = payload as Record<string, unknown>
  const candidates = [record.statusCode, record.status]

  for (const candidate of candidates) {
    const numericStatus = Number(candidate)
    if (Number.isFinite(numericStatus) && numericStatus > 0) return numericStatus
  }

  return fallback
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text.trim()) return null

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return text
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.assign("/login")
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  payload?: unknown,
): Promise<T | null> {
  const response = await fetch(`${proxyBaseUrl}${url}`, {
    method,
    headers: payload !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  })

  const responsePayload = await readResponsePayload(response)

  if (response.ok) {
    return responsePayload as T | null
  }

  if (response.status === 401) {
    redirectToLogin()
  }

  throw {
    message: extractErrorMessage(responsePayload, getFallbackMessage(response.status)),
    statusCode: extractStatusCode(responsePayload, response.status),
  } satisfies ApiError
}

function toApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    return { message: error.message || "Something went wrong", statusCode: 500 }
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>
    const statusCode = Number(record.statusCode ?? 500)

    return {
      message: String(record.message ?? "Something went wrong"),
      statusCode: Number.isFinite(statusCode) ? statusCode : 500,
    }
  }

  return { message: "Something went wrong", statusCode: 500 }
}

export const PostRequestAxios = async <TResponse, TPayload = unknown>(
  url: string,
  payload: TPayload,
): Promise<[TResponse | null, ApiError | null]> => {
  try {
    return [await request<TResponse>("POST", url, payload), null]
  } catch (error) {
    return [null, toApiError(error)]
  }
}

export const PatchRequestAxios = async <TResponse, TPayload = unknown>(
  url: string,
  payload: TPayload,
): Promise<[TResponse | null, ApiError | null]> => {
  try {
    return [await request<TResponse>("PATCH", url, payload), null]
  } catch (error) {
    return [null, toApiError(error)]
  }
}

export const GetRequestNormal = async <T>(
  url: string,
  _revalidate = 0,
  _revalidateTags = "stumaps",
): Promise<T> => {
  void _revalidate
  void _revalidateTags

  const response = await request<T>("GET", url)
  return response as T
}

export const DeleteRequestAxios = async <T>(
  url: string,
): Promise<[T | null, ApiError | null]> => {
  try {
    return [await request<T>("DELETE", url), null]
  } catch (error) {
    return [null, toApiError(error)]
  }
}
