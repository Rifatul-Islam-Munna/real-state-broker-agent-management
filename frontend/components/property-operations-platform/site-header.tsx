// @ts-nocheck
import { LogOutIcon } from "lucide-react"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const { data: user } = useMeQuery()
  const { mutate: logout, isPending } = useLogoutMutation()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-medium text-slate-950">Dashboard</h1>
          <p className="truncate text-xs text-slate-500">
            {user?.fullName ?? "User"} {user?.role ? `- ${user.role}` : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shadow-none"
          onClick={() => logout()}
          disabled={isPending}
        >
          <LogOutIcon className="size-4" />
          {isPending ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </header>
  )
}
