import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import QueryClint from "@/lib/QueryClint"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased")}
    >
      <body className="font-sans">
        {" "}
        <QueryClint>
          <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
        </QueryClint>
        <Toaster />
      </body>
    </html>
  )
}
