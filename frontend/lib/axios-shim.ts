type AxiosRequestConfig = {
  headers?: HeadersInit
}

type AxiosResponse<T> = {
  data: T
  status: number
}

export class AxiosError<T = unknown> extends Error {
  response?: {
    data: T
    status: number
  }
  status?: number

  constructor(message: string, status?: number, data?: T) {
    super(message)
    this.name = "AxiosError"
    this.status = status

    if (status !== undefined) {
      this.response = {
        data: data as T,
        status,
      }
    }
  }
}

async function readPayload<T>(response: Response) {
  if (response.status === 204) {
    return null as T
  }

  const raw = await response.text()

  if (!raw.trim()) {
    return null as T
  }

  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return JSON.parse(raw) as T
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return raw as T
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...config?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })

  const data = await readPayload<T>(response)

  if (!response.ok) {
    const errorPayload =
      data == null
        ? ({ message: `Request failed with status ${response.status}`, statusCode: response.status } as T)
        : (typeof data === "string"
            ? ({ message: data, statusCode: response.status } as T)
            : data)

    throw new AxiosError(
      typeof errorPayload === "object" && errorPayload !== null && "message" in (errorPayload as object)
        ? String((errorPayload as { message?: unknown }).message ?? "Request failed")
        : "Request failed",
      response.status,
      errorPayload,
    )
  }

  return {
    data,
    status: response.status,
  }
}

const axios = {
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>("DELETE", url, undefined, config),
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>("GET", url, undefined, config),
  isAxiosError(error: unknown): error is AxiosError {
    return error instanceof AxiosError
  },
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>("PATCH", url, body, config),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>("POST", url, body, config),
}

export default axios
