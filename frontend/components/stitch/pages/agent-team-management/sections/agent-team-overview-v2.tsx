import { AppIcon } from "@/components/ui/app-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { AgentUserOption } from "@/hooks/use-real-estate-api"

import { agentInitials } from "./agent-team-shared"

type TeamGroup = {
  name: string
  members: AgentUserOption[]
  listingCount: number
}

type AgentTeamOverviewProps = {
  agents: AgentUserOption[]
  onAddAgent: () => void
  onSearchChange: (value: string) => void
  searchTerm: string
  teamGroups: TeamGroup[]
}

export function AgentTeamOverview({
  agents,
  onAddAgent,
  onSearchChange,
  searchTerm,
  teamGroups,
}: AgentTeamOverviewProps) {
  const stats = [
    ["Total agents", agents.length, "group"],
    ["Active teams", teamGroups.length, "groups"],
    [
      "Total listings",
      agents.reduce((sum, item) => sum + (item.propertyCount ?? 0), 0),
      "domain",
    ],
    [
      "Verified agents",
      agents.filter((item) => item.isVerifiedAgent).length,
      "verified",
    ],
  ] as const

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-2xl">{"Agent & team management"}</CardTitle>
            <CardDescription>
              {"Manage agent profiles, availability, credentials, and dashboard permissions."}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-72">
              <AppIcon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                name="search"
              />
              <Input
                className="pl-9"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search agents or teams"
                value={searchTerm}
              />
            </div>
            <Button onClick={onAddAgent} type="button">
              <AppIcon name="person_add" />
              {"Add agent"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, icon]) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <AppIcon className="text-xl" name={icon} />
              </span>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{"Team structure"}</CardTitle>
            <CardDescription>{"Agency groups and their current listing load."}</CardDescription>
          </div>
          <Button onClick={onAddAgent} size="sm" type="button" variant="outline">
            {"Create agent"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {teamGroups.length > 0 ? (
            teamGroups.slice(0, 6).map((group) => (
              <Card key={group.name} size="sm">
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>
                    {`${group.members.length} agents • ${group.listingCount} listings`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex -space-x-2">
                  {group.members.slice(0, 4).map((agent) => (
                    <Avatar className="size-9 border-2 border-background" key={agent.id}>
                      {agent.avatarUrl ? (
                        <AvatarImage alt={agent.fullName} src={agent.avatarUrl} />
                      ) : null}
                      <AvatarFallback>{agentInitials(agent)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {group.members.length > 4 ? (
                    <Avatar className="size-9 border-2 border-background">
                      <AvatarFallback>{`+${group.members.length - 4}`}</AvatarFallback>
                    </Avatar>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground md:col-span-3">
              {"No team data is available yet."}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
