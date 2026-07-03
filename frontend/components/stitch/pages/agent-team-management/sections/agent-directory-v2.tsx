import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AgentUserOption } from "@/hooks/use-real-estate-api"

import {
  agentInitials,
  displayAgentText,
  formatAccessDetails,
  formatAccessSummary,
  formatAgentCreatedAt,
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
  onVerificationFilterChange: (
    value: "all" | "verified" | "unverified",
  ) => void
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
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>{"Agent directory"}</CardTitle>
          <CardDescription>{"Review account status, listings, and route access."}</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            modal={false}
            onValueChange={(value) =>
              onVerificationFilterChange(
                value as "all" | "verified" | "unverified",
              )
            }
            value={verificationFilter}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{"All agents"}</SelectItem>
              <SelectItem value="verified">{"Verified only"}</SelectItem>
              <SelectItem value="unverified">{"Unverified only"}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            modal={false}
            onValueChange={(value) => onSortChange(value as SortKey)}
            value={sortBy}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by newest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">{"Sort by newest"}</SelectItem>
              <SelectItem value="name">{"Sort by name"}</SelectItem>
              <SelectItem value="listings">{"Sort by listings"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Alert>
            <AlertDescription>{"Loading agents..."}</AlertDescription>
          </Alert>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : agents.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {"No agents match the current filters."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{"Agent"}</TableHead>
                <TableHead>{"Agency"}</TableHead>
                <TableHead>{"License"}</TableHead>
                <TableHead>{"Listings"}</TableHead>
                <TableHead>{"Status"}</TableHead>
                <TableHead>{"Commission"}</TableHead>
                <TableHead>{"Access"}</TableHead>
                <TableHead>{"Created"}</TableHead>
                <TableHead className="text-right">{"Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        {agent.avatarUrl ? (
                          <AvatarImage alt={agent.fullName} src={agent.avatarUrl} />
                        ) : null}
                        <AvatarFallback>{agentInitials(agent)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{agent.fullName}</p>
                        <p className="text-xs text-muted-foreground">{agent.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {displayAgentText(agent.phone, "No phone")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{displayAgentText(agent.agencyName, "Independent")}</TableCell>
                  <TableCell>{displayAgentText(agent.licenseNumber)}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {agent.propertyCount ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant={agent.isVerifiedAgent ? "default" : "outline"}>
                        {agent.isVerifiedAgent ? "Verified" : "Agent"}
                      </Badge>
                      <span
                        className={
                          agent.isActive === false
                            ? "text-xs text-destructive"
                            : "text-xs text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        {agent.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {agent.commissionRate != null ? `${agent.commissionRate}%` : "N/A"}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{formatAccessSummary(agent)}</p>
                    <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                      {formatAccessDetails(agent)}
                    </p>
                  </TableCell>
                  <TableCell>{formatAgentCreatedAt(agent.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => onEdit(agent)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {"Edit"}
                      </Button>
                      <Button
                        disabled={isDeleting}
                        onClick={() => onDelete(agent)}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        {"Delete"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
