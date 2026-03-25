// @ts-nocheck

type ApiError = {
  message: string
  statusCode: number
}

const proxyBaseUrl = "/api/proxy"

function extractValidationMessage(errors: unknown): string | null {
  if (!errors) {
    return null
  }

  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (typeof item === "string" && item.trim().length > 0) {
        return item
      }

      const nestedMessage = extractValidationMessage(item)
      if (nestedMessage) {
        return nestedMessage
      }
    }

    return null
  }

  if (typeof errors === "object") {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      const nestedMessage = extractValidationMessage(value)
      if (nestedMessage) {
        return nestedMessage
      }
    }
  }

  if (typeof errors === "string" && errors.trim().length > 0) {
    return errors
  }

  return null
}

function extractErrorMessage(payload: any, fallback = "Something went wrong"): string {
  if (!payload) {
    return fallback
  }

  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload
  }

  if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
    return payload.message
  }

  if (Array.isArray(payload?.message)) {
    const firstMessage = payload.message.find((item: unknown) => typeof item === "string" && item.trim().length > 0)
    if (firstMessage) {
      return firstMessage
    }
  }

  if (payload?.message && typeof payload.message === "object") {
    const nestedMessage = extractErrorMessage(payload.message, "")
    if (nestedMessage) {
      return nestedMessage
    }
  }

  if (typeof payload?.detail === "string" && payload.detail.trim().length > 0) {
    return payload.detail
  }

  const validationMessage = extractValidationMessage(payload?.errors)
  if (validationMessage) {
    return validationMessage
  }

  if (typeof payload?.title === "string" && payload.title.trim().length > 0) {
    return payload.title
  }

  return fallback
}

function getFallbackMessage(statusCode: number) {
  if (statusCode === 404) {
    return "Data not found."
  }

  return `Request failed with status ${statusCode}`
}

function extractStatusCode(payload: any, fallback = 500): number {
  const candidates = [payload?.statusCode, payload?.status]

  for (const candidate of candidates) {
    const numericStatus = Number(candidate)
    if (Number.isFinite(numericStatus) && numericStatus > 0) {
      return numericStatus
    }
  }

  return fallback
}

async function readErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? ""

  try {
    if (contentType.includes("application/json")) {
      return await response.json()
    }

    const text = await response.text()
    return text.trim().length > 0 ? text : null
  } catch {
    return null
  }
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
): Promise<T> {
  const response = await fetch(`${proxyBaseUrl}${url}`, {
    method,
    headers: payload !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  })

  if (response.ok) {
    if (response.status === 204) {
      return null as T
    }

    return await response.json()
  }

  if (response.status === 401 || response.status === 403) {
    redirectToLogin()
  }

  const errorPayload = await readErrorPayload(response)
  throw {
    message: extractErrorMessage(errorPayload, getFallbackMessage(response.status)),
    statusCode: extractStatusCode(errorPayload, response.status),
  } satisfies ApiError
}

function toApiError(error: unknown): ApiError | null {
  if (!error) {
    return null
  }

  if (typeof error === "object" && error !== null) {
    const message = "message" in error ? String((error as { message?: unknown }).message ?? "Something went wrong") : "Something went wrong"
    const statusCode = "statusCode" in error ? Number((error as { statusCode?: unknown }).statusCode ?? 500) : 500
    return { message, statusCode: Number.isFinite(statusCode) ? statusCode : 500 }
  }

  if (error instanceof Error) {
    return { message: error.message, statusCode: 500 }
  }

  return { message: "Something went wrong", statusCode: 500 }
}

export const PostRequestAxios = async <T>(
  url: string,
  payload: any,
): Promise<[T | null, ApiError | null]> => {
  try {
    return [await request<T>("POST", url, payload), null]
  } catch (error) {
    return [null, toApiError(error)]
  }
}

export const PatchRequestAxios = async <T>(
  url: string,
  payload: T,
): Promise<[T | null, ApiError | null]> => {
  try {
    return [await request<T>("PATCH", url, payload), null]
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
  return request<T>("GET", url)
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
