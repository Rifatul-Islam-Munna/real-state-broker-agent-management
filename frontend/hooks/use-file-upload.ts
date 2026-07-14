"use client"

import { useMutation } from "@tanstack/react-query"
import { sileo } from "sileo"

async function upload(file: File, category?: string) {
  const formData = new FormData()
  formData.append("file", file)
  if (category) formData.append("category", category)
  const response = await fetch("/api/upload", { method: "POST", body: formData })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message ?? "Upload failed")
  return data
}

export function useFileUploadMutation() {
  return useMutation({
    mutationKey: ["property-operations", "upload", "file"],
    mutationFn: ({ file, category }: { file: File; category?: string }) => upload(file, category),
    onSuccess: () => sileo.success({ title: "File uploaded" }),
    onError: (error: Error) => sileo.error({ title: "Upload failed", description: error.message }),
  })
}
