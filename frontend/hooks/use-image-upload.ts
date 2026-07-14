"use client"

import { useMutation } from "@tanstack/react-query"
import { sileo } from "sileo"

export function useImageUploadMutation() {
  return useMutation({
    mutationKey: ["property-operations", "upload", "image"],
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message ?? "Upload failed")
      return data
    },
    onSuccess: () => sileo.success({ title: "Image uploaded" }),
    onError: (error: Error) => sileo.error({ title: "Upload failed", description: error.message }),
  })
}
