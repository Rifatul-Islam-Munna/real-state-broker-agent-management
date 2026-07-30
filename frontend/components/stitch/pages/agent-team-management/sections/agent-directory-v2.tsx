import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AgentUserOption } from "@/hooks/use-real-estate-api"

import {
  agentInitials,
  displayAgentText,
  formatAccessSummary,
  type SortKey,
} from "./agent-team-shared"

type AgentDirectoryProps = {
  agents: AgentUserOption[]
  errorMessage?: string | null
  isDeleting: boolean
  isLoading: boolean
  onDelete: (agent: AgentUserOption) => void
  onEdit: (agent: AgentUserOption) => void
  onSortChange: (value: SortKey) => void
  onVerificationFilterChange: (value: "all" | "verified" | "unverified") => void
  sortBy: SortKey
  verificationFilter: "all" | "verified" | "unverified"
}

export function AgentDirectory({
  agents,
  errorMessage,
  isDeleting,
  isLoading,
  onDelete,
  onEdit,
  onSortChange,
  onVerificationFilterChange,
  sortBy,
  verificationFilter,
}: AgentDirectoryProps) {
  const maxListings = Math.max(...agents.map((agent) => agent.propertyCount ?? 0), 1)

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#c7c4d7]/40 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col gap-4 border-b border-[#c7c4d7]/40 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0b1c30]">Agent Directory</h2>
          <p className="mt-1 text-xs text-[#464555]">Review account status, listings, credentials, and route access.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select modal={false} onValueChange={(value) => onVerificationFilterChange(value as "all" | "verified" | "unverified")} value={verificationFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl border-[#c7c4d7] bg-[#f8f9ff] shadow-none sm:w-44"><SelectValue placeholder="Status: All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="verified">Verified only</SelectItem>
              <SelectItem value="unverified">Unverified only</SelectItem>
            </SelectContent>
          </Select>
          <Select modal={false} onValueChange={(value) => onSortChange(value as SortKey)} value={sortBy}>
            <SelectTrigger className="h-10 w-full rounded-xl border-[#c7c4d7] bg-[#f8f9ff] shadow-none sm:w-44"><SelectValue placeholder="Created: Recent" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Created: Recent</SelectItem>
              <SelectItem value="name">Sort by name</SelectItem>
              <SelectItem value="listings">Sort by listings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6"><Alert><AlertDescription>Loading agents...</AlertDescription></Alert></div>
      ) : errorMessage ? (
        <div className="p-6"><Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert></div>
      ) : agents.length === 0 ? (
        <div className="m-6 rounded-2xl border border-dashed border-[#c7c4d7] bg-[#f8f9ff] p-10 text-center text-sm text-[#464555]">No agents match the current filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-[#c7c4d7]/30 bg-[#eff4ff]/45">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">Agent</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">Agency/Group</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">Listings</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">Access</th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c7c4d7]/25">
              {agents.map((agent) => {
                const listingCount = agent.propertyCount ?? 0
                const listingWidth = Math.max(8, Math.round((listingCount / maxListings) * 100))
                return (
                  <tr className="transition hover:bg-[#eff4ff]/35" key={agent.id}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 border border-[#c7c4d7]/50">
                          {agent.avatarUrl ? <AvatarImage alt={agent.fullName} src={agent.avatarUrl} /> : null}
                          <AvatarFallback>{agentInitials(agent)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#0b1c30]">{agent.fullName}</p>
                          <p className="truncate text-xs text-[#464555]">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-[#0b1c30]">{displayAgentText(agent.agencyName, "Independent")}</p>
                      <p className="mt-1 text-xs text-[#464555]">LIC: {displayAgentText(agent.licenseNumber)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="w-8 font-bold text-[#0b1c30]">{listingCount}</span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e5eeff]"><div className="h-full rounded-full bg-[#4343d5]" style={{ width: `${listingWidth}%` }} /></div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge className={agent.isVerifiedAgent ? "rounded-full border-0 bg-[#d9fff8] px-2.5 py-1 text-[10px] font-bold uppercase text-[#006b5f]" : "rounded-full border-0 bg-[#e5eeff] px-2.5 py-1 text-[10px] font-bold uppercase text-[#464555]"}>
                          <AppIcon className="mr-1 text-sm" name={agent.isVerifiedAgent ? "check_circle" : "pending"} />
                          {agent.isVerifiedAgent ? "Verified" : "Pending"}
                        </Badge>
                        <span className={agent.isActive === false ? "text-[10px] font-semibold text-[#b40036]" : "text-[10px] font-semibold text-[#006b5f]"}>{agent.isActive === false ? "Inactive" : "Active"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-[#0b1c30]">{formatAccessSummary(agent)}</p>
                      <p className="mt-1 text-xs text-[#464555]">{agent.commissionRate != null ? `${agent.commissionRate}% commission` : "No commission set"}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-1">
                        <Button aria-label={`Edit ${agent.fullName}`} className="size-9 rounded-lg p-0 text-[#464555] hover:bg-[#e1e0ff] hover:text-[#4343d5]" onClick={() => onEdit(agent)} size="icon" title="Edit agent" type="button" variant="ghost"><AppIcon className="text-[18px]" name="edit" /></Button>
                        <Button aria-label={`Delete ${agent.fullName}`} className="size-9 rounded-lg p-0 text-[#464555] hover:bg-[#ffdadb] hover:text-[#b40036]" disabled={isDeleting} onClick={() => onDelete(agent)} size="icon" title="Delete agent" type="button" variant="ghost"><AppIcon className="text-[18px]" name="delete" /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#c7c4d7]/30 bg-[#eff4ff]/25 px-6 py-4">
        <span className="text-sm font-medium text-[#464555]">Showing {agents.length} agents</span>
        <span className="rounded-lg bg-[#4343d5] px-3 py-1.5 text-xs font-bold text-white">Live directory</span>
      </div>
    </section>
  )
}
