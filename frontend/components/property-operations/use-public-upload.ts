"use client"

import { useState } from "react"

export function usePublicUpload(token = "") {
  const [urls, setUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function upload(file: File) {
    setUploading(true)
    setError("")
    try {
      if (!token) throw new Error("A secure request token is required for uploads.")
      const body = new FormData()
      body.append("file", file)
      const response = await fetch(`/api/property-operations-proxy/property-operations/public/${encodeURIComponent(token)}/upload`, { method: "POST", body })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || "Upload failed")
      setUrls((items) => [...items, String(data.url)])
    } catch (value) {
      setError(value instanceof Error ? value.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return { error, upload, uploading, urls }
}
