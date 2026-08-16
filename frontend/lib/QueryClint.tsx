"use client"

import React, { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

const QueryClint = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {mounted && process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools buttonPosition="bottom-right" />
      ) : null}
    </QueryClientProvider>
  )
}

export default QueryClint
