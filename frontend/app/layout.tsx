import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import QueryClint from "@/lib/QueryClint"
import { cn } from "@/lib/utils"
import { Cinzel, Nunito_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-cinzel",
  display: "swap",
})

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-nunito",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", cinzel.variable, nunitoSans.variable)}
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
