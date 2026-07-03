import { redirect } from "next/navigation"

import { RegisterForm } from "@/components/auth/register-form"
import { PublicPrimaryNavbar } from "@/components/stitch/shared/public-site-navbar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSessionUser } from "@/lib/auth-actions"
import { getPortalHomePath } from "@/lib/portal-paths"

export default async function RegisterPage() {
  const user = await getSessionUser()

  if (user) {
    redirect(getPortalHomePath(user))
  }

  return (
    <div className="min-h-screen bg-muted/25">
      <PublicPrimaryNavbar />
      <main className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-12">
        <Card className="overflow-hidden border-0 bg-primary text-primary-foreground shadow-xl">
          <CardHeader className="p-7 sm:p-9">
            <Badge
              className="w-fit border-white/15 bg-white/10 text-white"
              variant="outline"
            >
              {"EstateBlue agent workspace"}
            </Badge>
            <CardTitle className="mt-4 text-4xl leading-tight sm:text-5xl">
              {"Create a secure agent account for daily real estate operations."}
            </CardTitle>
            <CardDescription className="mt-3 text-base leading-7 text-primary-foreground/75">
              {"New registrations receive agent access. Administrator accounts and elevated permissions are managed only from the secured dashboard."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-7 pb-7 sm:px-9 sm:pb-9">
            {[
              "Permission-aware dashboard routes",
              "Secure server-managed account role",
              "Responsive shadcn form controls",
            ].map((item) => (
              <div
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium"
                key={item}
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <Badge className="w-fit" variant="secondary">
              {"Agent registration"}
            </Badge>
            <CardTitle className="text-3xl">{"Create account"}</CardTitle>
            <CardDescription>
              {"Enter the agent details below. Your account role is assigned securely by the server."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
