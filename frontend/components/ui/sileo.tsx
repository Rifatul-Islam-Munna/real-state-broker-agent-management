"use client"

import type { ComponentProps } from "react"

import { useTheme } from "next-themes"
import { Toaster as SileoToaster, type SileoOptions } from "sileo"

const defaultToastOptions: Partial<SileoOptions> = {
  autopilot: {
    collapse: 180,
    expand: 220,
  },
  roundness: 0,
  styles: {
    description: "text-sm text-slate-500 dark:text-slate-300",
    title: "font-bold tracking-tight text-slate-950 dark:text-white",
  },
}

type ToasterProps = Omit<ComponentProps<typeof SileoToaster>, "options" | "theme">

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme()

  return (
    <SileoToaster
      offset={{ top: 24 }}
      options={defaultToastOptions}
      position="top-center"
      theme={theme === "dark" ? "dark" : theme === "light" ? "light" : "system"}
      {...props}
    />
  )
}