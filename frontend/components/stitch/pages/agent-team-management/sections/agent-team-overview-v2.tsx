import { AppIcon } from "@/components/ui/app-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
  const totalListings = agents.reduce((sum, item) => sum + (item.propertyCount ?? 0), 0)
  const verifiedAgents = agents.filter((item) => item.isVerifiedAgent).length
  const verificationRate = agents.length > 0 ? Math.round((verifiedAgents / agents.length) * 100) : 0
  const stats = [
    { label: "Total agents", value: agents.length, icon: "groups", tone: "primary" },
    { label: "Active teams", value: teamGroups.length, icon: "hub", tone: "secondary" },
    { label: "Total listings", value: totalListings, icon: "apartment", tone: "tertiary" },
    { label: "Verified agents", value: verifiedAgents, icon: "verified", tone: "success", badge: `${verificationRate}% match` },
  ] as const

  return (
    <>
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-[36px] font-bold leading-tight tracking-[-0.03em] text-[#0b1c30]">Agent &amp; Team Management</h1>
          <p className="mt-1 text-[15px] text-[#464555]">Oversee agency distribution, agent performance, and team hierarchies.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-[280px]">
            <AppIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#767586]" name="search" />
            <Input
              className="h-11 rounded-full border-[#c7c4d7] bg-white pl-10 shadow-none"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search agents, teams, or licenses..."
              value={searchTerm}
            />
          </div>
          <Button className="h-11 rounded-xl bg-[#4343d5] px-5 font-bold text-white shadow-lg shadow-[#4343d5]/20 hover:bg-[#3737bd]" onClick={onAddAgent} type="button">
            <AppIcon name="person_add" /> Add Agent
          </Button>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const iconClass = stat.tone === "secondary"
            ? "bg-[#d9fff8] text-[#006b5f]"
            : stat.tone === "tertiary"
              ? "bg-[#ffdadb] text-[#b40036]"
              : stat.tone === "success"
                ? "bg-green-100 text-green-700"
                : "bg-[#e1e0ff] text-[#4343d5]"
          return (
            <article className="rounded-[24px] border border-[#c7c4d7]/40 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(93,95,239,0.08)]" key={stat.label}>
              <div className="flex items-start justify-between gap-4">
                <span className={`flex size-10 items-center justify-center rounded-xl ${iconClass}`}><AppIcon name={stat.icon} /></span>
                {"badge" in stat ? <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase text-green-700">{stat.badge}</span> : null}
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">{stat.label}</p>
              <p className="mt-2 text-[32px] font-bold leading-none tracking-[-0.03em] text-[#0b1c30]">{stat.value.toLocaleString()}</p>
            </article>
          )
        })}
      </section>

      <section className="rounded-[24px] border border-[#c7c4d7]/40 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#0b1c30]">Team Structure</h2>
            <p className="mt-1 text-xs text-[#464555]">Agency groups and their current listing load.</p>
          </div>
          <Button className="text-[#4343d5]" onClick={onAddAgent} size="sm" type="button" variant="ghost">Add agent</Button>
        </div>
        {teamGroups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teamGroups.slice(0, 6).map((group, index) => (
              <article className={index === 0 ? "rounded-2xl border border-[#c7c4d7]/40 bg-[#eff4ff] p-4" : "rounded-2xl border border-[#c7c4d7]/40 bg-white p-4"} key={group.name}>
                <div className="flex items-center gap-3">
                  <span className={index === 0 ? "flex size-10 items-center justify-center rounded-xl bg-[#4343d5] text-white" : "flex size-10 items-center justify-center rounded-xl bg-[#e5eeff] text-[#464555]"}>
                    <AppIcon name={index === 0 ? "corporate_fare" : "account_tree"} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-[#0b1c30]">{group.name}</h3>
                    <p className="text-xs text-[#464555]">{group.members.length} agents • {group.listingCount} listings</p>
                  </div>
                </div>
                <div className="mt-4 flex -space-x-2">
                  {group.members.slice(0, 4).map((agent) => (
                    <Avatar className="size-8 border-2 border-white" key={agent.id}>
                      {agent.avatarUrl ? <AvatarImage alt={agent.fullName} src={agent.avatarUrl} /> : null}
                      <AvatarFallback>{agentInitials(agent)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {group.members.length > 4 ? <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#d3e4fe] text-[10px] font-bold">+{group.members.length - 4}</span> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#c7c4d7] bg-[#f8f9ff] p-8 text-center text-sm text-[#464555]">No team data is available yet.</div>
        )}
      </section>
    </>
  )
}
