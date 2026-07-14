"use client"

export type ApiErrorShape = { message: string; statusCode: number }

async function request<T>(method: string, url: string, payload?: unknown): Promise<[T | null, ApiErrorShape | null]> {
  try {
    const response = await fetch(`/api/property-operations-platform${url}`, {
      method,
      headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      cache: "no-store",
    })
    const text = await response.text()
    const data = text ? JSON.parse(text) : null
    if (!response.ok) return [null, { message: data?.message ?? `Request failed (${response.status})`, statusCode: response.status }]
    return [data as T, null]
  } catch (error) {
    return [null, { message: error instanceof Error ? error.message : "Unknown error", statusCode: 500 }]
  }
}

export const getRequest = <T>(url: string) => request<T>("GET", url)
export const postRequest = <T, TVariables>(url: string, payload: TVariables) => request<T>("POST", url, payload)
export const patchRequest = <T, TVariables>(url: string, payload: TVariables) => request<T>("PATCH", url, payload)
export const deleteRequest = <T>(url: string) => request<T>("DELETE", url)
