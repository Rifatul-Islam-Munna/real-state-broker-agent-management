"use client"

import * as React from "react"

type ThemeName = "light" | "dark"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: ThemeName | "system"
}

function resolveInitialTheme(defaultTheme: ThemeProviderProps["defaultTheme"]): ThemeName {
  if (typeof window === "undefined") return "light"
  const stored = window.localStorage.getItem("theme")
  if (stored === "light" || stored === "dark") return stored
  if (defaultTheme === "light" || defaultTheme === "dark") return defaultTheme
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: ThemeName) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<ThemeName>("light")

  React.useEffect(() => {
    const initial = resolveInitialTheme(defaultTheme)
    setTheme(initial)
    applyTheme(initial)
  }, [defaultTheme])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if ((event.key?.toLowerCase?.() ?? "") !== "d" || isTypingTarget(event.target)) return
      setTheme((current) => {
        const next = current === "dark" ? "light" : "dark"
        window.localStorage.setItem("theme", next)
        applyTheme(next)
        return next
      })
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return <>{children}</>
}

export { ThemeProvider }
