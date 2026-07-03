import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Section1SectionProps = {
  onAddLeadClick: () => void
  onSearchChange: (value: string) => void
  searchTerm: string
}

export function Section1Section({
  onAddLeadClick,
  onSearchChange,
  searchTerm,
}: Section1SectionProps) {
  return (
    <Card className="rounded-none border-x-0 border-t-0 shadow-none">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <AppIcon className="text-xl" name="group" />
          </span>
          <div>
            <CardTitle className="text-xl">{"Lead CRM"}</CardTitle>
            <CardDescription>
              {"Track every buyer and seller from first touch to signed deal."}
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-80">
            <AppIcon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              name="search"
            />
            <Input
              className="pl-9"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search leads, properties, or agents"
              value={searchTerm}
            />
          </div>
          <Button render={<Link href="/dashboard/lead-schedule" />} variant="outline">
            <AppIcon name="event_note" />
            {"Lead activity"}
          </Button>
          <Button onClick={onAddLeadClick} type="button">
            <AppIcon name="person_add" />
            {"Add lead"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="hidden" />
    </Card>
  )
}
