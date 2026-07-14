// @ts-nocheck
"use client"

import { useState } from "react"
import { Bell, BriefcaseBusiness, Building2, CalendarRange, ClipboardCheck, Home, Repeat, TrendingDown, TrendingUp, TriangleAlert, Users, WalletCards, Wrench } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useOrganizationStripeSettingsQuery } from "@/hooks/use-organization-settings"
import {
  DashboardPanelSkeleton,
  DashboardCardSkeleton,
  DashboardTableSkeleton,
  WithBone,
} from "@/components/dashboard/dashboard-loading"
import {
  useOwnerAnnouncementsQuery,
  useOwnerAnalyticsQuery,
  useOwnerFinanceEntriesQuery,
  useOwnerInspectionsQuery,
  useOwnerOccupancyStatsQuery,
  useOwnerPropertiesQuery,
  useOwnerRecurringMaintenancesQuery,
  useOwnerTechniciansQuery,
  useOwnerTechnicianStatsQuery,
  useOwnerTenantsQuery,
  useOwnerTicketStatsQuery,
  useOwnerTicketsQuery,
  useOwnerUnitsQuery,
  useOwnerUsersQuery,
  useOwnerVendorsQuery,
  useOwnerWorkOrdersQuery,
} from "@/hooks/use-owner-dashboard"
import {
  useOwnerDeleteTechnicianMutation,
  useOwnerDeleteFinanceEntryMutation,
  useOwnerDeleteTenantMutation,
  useOwnerDeleteUnitMutation,
  useOwnerCreateFinanceEntryMutation,
  useOwnerTogglePropertyMutation,
  useOwnerUpdateFinanceEntryMutation,
  useOwnerToggleTechnicianMutation,
  useOwnerToggleTenantMutation,
  useOwnerToggleUnitMutation,
} from "@/hooks/use-owner-actions"

function MetricCard({
  title,
  value,
  note,
}: {
  title: string
  value: string | number
  note: string
}) {
  return (
    <Card className="border-border bg-background shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-slate-950">{value}</div>
        <p className="text-xs text-slate-600">{note}</p>
      </CardContent>
    </Card>
  )
}

function formatMoney(value?: number | null, currency = "USD") {
  return `${currency} ${value ?? 0}`
}

function resolveDisplayCurrency(currency: string | null | undefined, fallback = "USD") {
  const normalized = currency?.trim()?.toUpperCase()
  if (!normalized || normalized === "BDT") return fallback
  return normalized
}

const DEFAULT_CURRENCY_OPTIONS = [
  { value: "usd", label: "USD" },
  { value: "bdt", label: "BDT" },
  { value: "eur", label: "EUR" },
  { value: "gbp", label: "GBP" },
]

export function TenantOwnerDashboard() {
  const analytics = useOwnerAnalyticsQuery()
  const stripeSettings = useOrganizationStripeSettingsQuery()
  const defaultCurrency = stripeSettings.data?.defaultCurrency?.toUpperCase() ?? "USD"
  const ticketStats = useOwnerTicketStatsQuery()
  const occupancy = useOwnerOccupancyStatsQuery()
  const technicianStats = useOwnerTechnicianStatsQuery()
  const users = useOwnerUsersQuery()
  const properties = useOwnerPropertiesQuery()
  const units = useOwnerUnitsQuery()
  const tenants = useOwnerTenantsQuery()
  const technicians = useOwnerTechniciansQuery()
  const tickets = useOwnerTicketsQuery()
  const announcements = useOwnerAnnouncementsQuery()
  const financeEntries = useOwnerFinanceEntriesQuery()
  const vendors = useOwnerVendorsQuery()
  const workOrders = useOwnerWorkOrdersQuery()
  const recurring = useOwnerRecurringMaintenancesQuery()
  const inspections = useOwnerInspectionsQuery()
  const toggleProperty = useOwnerTogglePropertyMutation()
  const toggleUnit = useOwnerToggleUnitMutation()
  const toggleTenant = useOwnerToggleTenantMutation()
  const toggleTechnician = useOwnerToggleTechnicianMutation()
  const deleteUnit = useOwnerDeleteUnitMutation()
  const deleteTenant = useOwnerDeleteTenantMutation()
  const deleteTechnician = useOwnerDeleteTechnicianMutation()
  const createFinanceEntry = useOwnerCreateFinanceEntryMutation()
  const updateFinanceEntry = useOwnerUpdateFinanceEntryMutation()
  const deleteFinanceEntry = useOwnerDeleteFinanceEntryMutation()

  const propertiesList = Array.isArray(properties.data) ? properties.data : []
  const unitsList = Array.isArray(units.data) ? units.data : []
  const usersList = Array.isArray(users.data) ? users.data : []
  const tenantsList = Array.isArray(tenants.data) ? tenants.data : []
  const techniciansList = Array.isArray(technicians.data) ? technicians.data : []
  const ticketsList = Array.isArray(tickets.data) ? tickets.data : []
  const announcementsList = Array.isArray(announcements.data) ? announcements.data : []
  const financeList = Array.isArray(financeEntries.data) ? financeEntries.data : []
  const vendorsList = Array.isArray(vendors.data) ? vendors.data : []
  const workOrdersList = Array.isArray(workOrders.data) ? workOrders.data : []
  const recurringList = Array.isArray(recurring.data) ? recurring.data : []
  const inspectionsList = Array.isArray(inspections.data) ? inspections.data : []

  const loading =
    analytics.isLoading ||
    users.isLoading ||
    properties.isLoading ||
    units.isLoading ||
    tenants.isLoading ||
    technicians.isLoading ||
    vendors.isLoading ||
    workOrders.isLoading ||
    recurring.isLoading ||
    inspections.isLoading ||
    financeEntries.isLoading

  const finance = analytics.data?.finance
  const [financeForm, setFinanceForm] = useState({
    kind: "expense",
    title: "",
    category: "",
    amount: "",
    currency: "usd",
    occurredAt: new Date().toISOString().slice(0, 10),
    propertyId: "",
    description: "",
    note: "",
    status: "cleared",
  })

  return (
    <div className="space-y-6">
      <WithBone name="owner-overview" loading={loading} fallback={<DashboardPanelSkeleton />}>
        <section id="overview" className="rounded-2xl border bg-background p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                Tenant owner workspace
              </Badge>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Same admin-grade look, focused on properties, units, staff, residents.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Manage many properties, create workers and residents, control units, vendors, payments, notices, tickets, and field technicians.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:grid-cols-6">
              <div className="rounded-xl border bg-background px-4 py-3"><p className="text-slate-500">Properties</p><p className="mt-1 text-lg font-semibold">{propertiesList.length ?? 0}</p></div>
              <div className="rounded-xl border bg-background px-4 py-3"><p className="text-slate-500">Units</p><p className="mt-1 text-lg font-semibold">{unitsList.length ?? 0}</p></div>
              <div className="rounded-xl border bg-background px-4 py-3"><p className="text-slate-500">Users</p><p className="mt-1 text-lg font-semibold">{usersList.length ?? 0}</p></div>
              <div className="rounded-xl border bg-background px-4 py-3"><p className="text-slate-500">Tickets</p><p className="mt-1 text-lg font-semibold">{analytics.data?.openTickets ?? 0}</p></div>
              <div className="rounded-xl border bg-background px-4 py-3"><p className="text-slate-500">Vendors</p><p className="mt-1 text-lg font-semibold">{vendorsList.length ?? 0}</p></div>
              <div className="rounded-xl border bg-background px-4 py-3"><p className="text-slate-500">Due amount</p><p className="mt-1 text-lg font-semibold">{formatMoney(finance?.dueAmount ?? 0, defaultCurrency)}</p></div>
            </div>
          </div>
        </section>
      </WithBone>

      <WithBone
        name="owner-metrics"
        loading={loading}
        fallback={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <DashboardCardSkeleton key={index} />)}</div>}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard title="Occupancy" value={`${analytics.data?.occupancyRate ?? 0}%`} note={`${occupancy.data?.occupied ?? 0} occupied / ${analytics.data?.totalUnits ?? 0} units`} />
          <MetricCard title="Open tickets" value={analytics.data?.openTickets ?? 0} note={`${ticketStats.data?.byPriority?.length ?? 0} priority buckets`} />
          <MetricCard title="Month earnings" value={formatMoney(finance?.currentMonthEarnings ?? 0, defaultCurrency)} note={`${finance?.earningsGrowthPct ?? 0}% vs last month`} />
          <MetricCard title="Month expenses" value={formatMoney(finance?.currentMonthExpenses ?? 0, defaultCurrency)} note={`${finance?.expenseGrowthPct ?? 0}% vs last month`} />
          <MetricCard title="Month net" value={formatMoney(finance?.currentMonthNet ?? 0, defaultCurrency)} note={`${finance?.overdueBills ?? 0} overdue bills`} />
          <MetricCard title="Due ledger" value={formatMoney(finance?.dueAmount ?? 0, defaultCurrency)} note={`${finance?.unpaidBills ?? 0} unpaid bills`} />
        </div>
      </WithBone>

      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <WithBone name="owner-properties" loading={properties.isLoading} fallback={<DashboardTableSkeleton />}>
              <Card id="properties" className="shadow-none">
                <CardHeader>
                  <CardTitle>Properties</CardTitle>
                  <CardDescription>Owner can keep many properties here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {propertiesList.length === 0 ? (
                    <Empty><EmptyHeader><EmptyMedia variant="icon"><Building2 /></EmptyMedia><EmptyTitle>No properties</EmptyTitle><EmptyDescription>Add first property from controls.</EmptyDescription></EmptyHeader></Empty>
                  ) : propertiesList.map((property) => (
                    <div key={property._id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-950">{property.name}</p>
                        <p className="text-xs text-slate-600">{property.type} â€¢ {property.totalUnits ?? 0} units</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={property.isActive ?? false}
                          onCheckedChange={(checked) =>
                            toggleProperty.mutate({ id: property._id, payload: { isActive: checked ?? false } })
                          }
                        />
                        <Badge variant={property.isActive ? "default" : "outline"}>{property.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </WithBone>

            <WithBone name="owner-units" loading={units.isLoading} fallback={<DashboardTableSkeleton />}>
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle>Units</CardTitle>
                  <CardDescription>Track occupancy and availability.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {unitsList.length === 0 ? (
                    <Empty><EmptyHeader><EmptyMedia variant="icon"><Home /></EmptyMedia><EmptyTitle>No units</EmptyTitle><EmptyDescription>Add units under any owner property.</EmptyDescription></EmptyHeader></Empty>
                  ) : unitsList.slice(0, 8).map((unit) => (
                    <div key={unit._id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-950">{unit.unitNumber}</p>
                        <p className="text-xs text-slate-600">{unit.status} â€¢ rent {unit.rentAmount ?? 0}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={(unit as { isActive?: boolean }).isActive ?? false} onCheckedChange={(checked) => toggleUnit.mutate({ id: unit._id, payload: { isActive: checked ?? false } })} />
                        <Button variant="outline" size="sm" onClick={() => deleteUnit.mutate(unit._id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </WithBone>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(145deg,#f8fbff_0%,#eef8f1_100%)] shadow-none">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700">Analytics</Badge>
                  <Badge variant="secondary">{finance?.monthlySeries?.length ?? 0} month view</Badge>
                </div>
                <CardTitle className="text-xl">Money map</CardTitle>
                <CardDescription>Monthly earnings, expenses, due, growth, and issue pressure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-emerald-700"><TrendingUp className="size-4" /> Earnings</div>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(finance?.totalEarnings ?? 0, defaultCurrency)}</p>
                    <p className="mt-1 text-xs text-slate-500">Paid bills plus manual earnings</p>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-rose-700"><TrendingDown className="size-4" /> Expenses</div>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(finance?.totalExpenses ?? 0, defaultCurrency)}</p>
                    <p className="mt-1 text-xs text-slate-500">Outside spend like utility, repair, office</p>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-blue-700"><WalletCards className="size-4" /> Net</div>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(finance?.netIncome ?? 0, defaultCurrency)}</p>
                    <p className="mt-1 text-xs text-slate-500">Earnings minus expenses</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-amber-700"><TriangleAlert className="size-4" /> Due</div>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(finance?.dueAmount ?? 0, defaultCurrency)}</p>
                    <p className="mt-1 text-xs text-slate-500">{finance?.overdueBills ?? 0} overdue / {finance?.unpaidBills ?? 0} unpaid</p>
                  </div>
                </div>

                  <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-2xl border bg-white/85 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <CalendarRange className="size-4 text-slate-500" />
                      <p className="text-sm font-medium text-slate-950">6-month trend</p>
                    </div>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={finance?.monthlySeries ?? []}>
                          <defs>
                            <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
                            </linearGradient>
                            <linearGradient id="expensesFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.28} />
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.04} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="earnings" stroke="#10b981" fill="url(#earningsFill)" strokeWidth={2} />
                          <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="url(#expensesFill)" strokeWidth={2} />
                          <Area type="monotone" dataKey="due" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {(finance?.monthlySeries ?? []).slice(-3).map((item) => (
                        <div key={item.month} className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                          <p className="font-medium text-slate-950">{item.month}</p>
                          <p className="mt-1">E {formatMoney(item.earnings, defaultCurrency)}</p>
                          <p>X {formatMoney(item.expenses, defaultCurrency)}</p>
                          <p>D {formatMoney(item.due, defaultCurrency)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border bg-white/85 p-4">
                      <p className="text-sm font-medium text-slate-950">Issue detector</p>
                      <div className="mt-3 space-y-2">
                        {(finance?.issueSummary ?? []).map((issue) => (
                          <div key={issue.label} className="rounded-xl border p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-950">{issue.label}</span>
                              <Badge variant="outline">{issue.count}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{issue.amount ? formatMoney(issue.amount, defaultCurrency) : "Ops count issue"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-white/85 p-4">
                      <p className="text-sm font-medium text-slate-950">Ops cost details</p>
                      <div className="mt-3 grid gap-3">
                        <div className="rounded-xl border p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-950">Repair jobs</span>
                            <Badge variant="outline">{finance?.opsCosts?.workOrders?.count ?? 0}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">Estimated {formatMoney(finance?.opsCosts?.workOrders?.estimated ?? 0, defaultCurrency)} | Actual {formatMoney(finance?.opsCosts?.workOrders?.actual ?? 0, defaultCurrency)}</p>
                        </div>
                        <div className="rounded-xl border p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-950">Inspections</span>
                            <Badge variant="outline">{finance?.opsCosts?.inspections?.count ?? 0}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">Estimated {formatMoney(finance?.opsCosts?.inspections?.estimated ?? 0, defaultCurrency)} | Actual {formatMoney(finance?.opsCosts?.inspections?.actual ?? 0, defaultCurrency)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-white/85 p-4">
                      <p className="text-sm font-medium text-slate-950">Top categories</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Expense pressure</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(finance?.topExpenseCategories ?? []).length ? (finance?.topExpenseCategories ?? []).map((item) => <Badge key={`${item.label}-${item.total}`} variant="outline">{item.label}: {formatMoney(item.total, defaultCurrency)}</Badge>) : <span className="text-xs text-slate-500">No expenses yet</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Extra earnings</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(finance?.topEarningCategories ?? []).length ? (finance?.topEarningCategories ?? []).map((item) => <Badge key={`${item.label}-${item.total}`} variant="secondary">{item.label}: {formatMoney(item.total, defaultCurrency)}</Badge>) : <span className="text-xs text-slate-500">No earnings yet</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Add earning or expense</CardTitle>
                <CardDescription>Outside finance rows not tied directly to resident bill.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    createFinanceEntry.mutate({
                      kind: financeForm.kind as "earning" | "expense",
                      title: financeForm.title,
                      category: financeForm.category,
                      amount: Number(financeForm.amount || "0"),
                      currency: financeForm.currency || undefined,
                      occurredAt: new Date(financeForm.occurredAt).toISOString(),
                      propertyId: financeForm.propertyId || undefined,
                      description: financeForm.description || undefined,
                      note: financeForm.note || undefined,
                      status: financeForm.status as "pending" | "cleared" | "canceled",
                    }, {
                      onSuccess: () => setFinanceForm({
                        kind: "expense",
                        title: "",
                        category: "",
                        amount: "",
                        currency: "usd",
                        occurredAt: new Date().toISOString().slice(0, 10),
                        propertyId: "",
                        description: "",
                        note: "",
                        status: "cleared",
                      }),
                    })
                  }}
                >
                  <FieldGroup>
                    <Field><FieldLabel>Kind</FieldLabel><div className="grid grid-cols-2 gap-2"><Button type="button" variant={financeForm.kind === "earning" ? "default" : "outline"} className="shadow-none" onClick={() => setFinanceForm((current) => ({ ...current, kind: "earning" }))}>Earning</Button><Button type="button" variant={financeForm.kind === "expense" ? "default" : "outline"} className="shadow-none" onClick={() => setFinanceForm((current) => ({ ...current, kind: "expense" }))}>Expense</Button></div></Field>
                    <Field><FieldLabel>Title</FieldLabel><Input value={financeForm.title} onChange={(event) => setFinanceForm((current) => ({ ...current, title: event.target.value ?? "" }))} /></Field>
                    <Field><FieldLabel>Category</FieldLabel><Input placeholder="utility, repair, owner_funding" value={financeForm.category} onChange={(event) => setFinanceForm((current) => ({ ...current, category: event.target.value ?? "" }))} /></Field>
                    <Field><FieldLabel>Amount</FieldLabel><Input type="number" value={financeForm.amount} onChange={(event) => setFinanceForm((current) => ({ ...current, amount: event.target.value ?? "" }))} /></Field>
                    <Field><FieldLabel>Date</FieldLabel><Input type="date" value={financeForm.occurredAt} onChange={(event) => setFinanceForm((current) => ({ ...current, occurredAt: event.target.value ?? "" }))} /></Field>
                    <Field><FieldLabel>Status</FieldLabel><div className="grid grid-cols-3 gap-2"><Button type="button" variant={financeForm.status === "pending" ? "default" : "outline"} className="shadow-none" onClick={() => setFinanceForm((current) => ({ ...current, status: "pending" }))}>Pending</Button><Button type="button" variant={financeForm.status === "cleared" ? "default" : "outline"} className="shadow-none" onClick={() => setFinanceForm((current) => ({ ...current, status: "cleared" }))}>Cleared</Button><Button type="button" variant={financeForm.status === "canceled" ? "default" : "outline"} className="shadow-none" onClick={() => setFinanceForm((current) => ({ ...current, status: "canceled" }))}>Canceled</Button></div></Field>
                    <Field><FieldLabel>Property (Optional)</FieldLabel><Select value={financeForm.propertyId} onValueChange={(value) => setFinanceForm((current) => ({ ...current, propertyId: value ?? "" }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select property" /></SelectTrigger><SelectContent><SelectGroup>{propertiesList.map((property) => <SelectItem key={property._id} value={property._id}>{property.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
                    <Field><FieldLabel>Currency</FieldLabel><Select value={financeForm.currency} onValueChange={(value) => setFinanceForm((current) => ({ ...current, currency: value ?? "usd" }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{DEFAULT_CURRENCY_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
                    <Field><FieldLabel>Description</FieldLabel><Textarea value={financeForm.description} onChange={(event) => setFinanceForm((current) => ({ ...current, description: event.target.value ?? "" }))} /></Field>
                    <Field><FieldLabel>Note</FieldLabel><Textarea value={financeForm.note} onChange={(event) => setFinanceForm((current) => ({ ...current, note: event.target.value ?? "" }))} /></Field>
                  </FieldGroup>
                  <Button type="submit" disabled={createFinanceEntry.isPending || !financeForm.title || !financeForm.category || !financeForm.amount}>Save finance entry</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Recent ledger</CardTitle>
              <CardDescription>Quick mobile list for owner-added earnings and expenses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {financeList.length ? financeList.slice(0, 12).map((item) => (
                <div key={item._id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{item.title}</p>
                    <Badge variant={item.kind === "earning" ? "secondary" : "outline"}>{item.kind}</Badge>
                    <Badge>{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.category} | {new Date(item.occurredAt).toLocaleDateString()}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(item.amount, resolveDisplayCurrency(item.currency, defaultCurrency))}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.description ?? item.note ?? "No extra note"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className="shadow-none" onClick={() => updateFinanceEntry.mutate({ id: item._id, payload: { status: "cleared" } })}>Mark cleared</Button>
                    <Button type="button" size="sm" variant="outline" className="shadow-none" onClick={() => updateFinanceEntry.mutate({ id: item._id, payload: { status: "canceled" } })}>Cancel</Button>
                    <Button type="button" size="sm" variant="outline" className="shadow-none" onClick={() => deleteFinanceEntry.mutate(item._id)}>Delete</Button>
                  </div>
                </div>
              )) : (
                <Empty><EmptyHeader><EmptyMedia variant="icon"><WalletCards /></EmptyMedia><EmptyTitle>No finance entries yet</EmptyTitle><EmptyDescription>Add outside earnings or expenses to unlock analytics.</EmptyDescription></EmptyHeader></Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="people" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Workers, renters, guests under owner scope.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {usersList.slice(0, 8).map((user) => (
                  <div key={user.id} className="rounded-xl border p-3">
                    <p className="font-medium text-slate-950">{user.fullName}</p>
                    <p className="text-xs text-slate-600">{user.role} â€¢ {user.email}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card id="tenants" className="shadow-none">
              <CardHeader>
                <CardTitle>Tenant records</CardTitle>
                <CardDescription>Guests and renters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tenantsList.length === 0 ? (
                  <Empty><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>No tenant records</EmptyTitle><EmptyDescription>Add guest or renter records from controls.</EmptyDescription></EmptyHeader></Empty>
                ) : tenantsList.slice(0, 8).map((tenant) => (
                  <div key={tenant._id} className="flex flex-col gap-3 rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-950">{tenant.fullName}</p>
                        <p className="text-xs text-slate-600">{tenant.tenantKind ?? "resident"}</p>
                      </div>
                      <Badge variant={(tenant.isActive ?? false) ? "default" : "outline"}>{(tenant.isActive ?? false) ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={tenant.isActive ?? false} onCheckedChange={(checked) => toggleTenant.mutate({ id: tenant._id, payload: { isActive: checked ?? false } })} />
                      <Button variant="outline" size="sm" onClick={() => deleteTenant.mutate(tenant._id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Technicians</CardTitle>
                <CardDescription>Global profiles linked to owner properties.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {techniciansList.length === 0 ? (
                  <Empty><EmptyHeader><EmptyMedia variant="icon"><Wrench /></EmptyMedia><EmptyTitle>No technicians</EmptyTitle><EmptyDescription>Add or link technician now.</EmptyDescription></EmptyHeader></Empty>
                ) : techniciansList.slice(0, 8).map((technician) => (
                  <div key={technician._id} className="flex flex-col gap-3 rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-950">{technician.fullName}</p>
                        <p className="text-xs text-slate-600">{technician.specialty ?? "General"}</p>
                      </div>
                      <Badge variant={(technician.isActive ?? false) ? "default" : "outline"}>{(technician.isActive ?? false) ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={technician.isActive ?? false} onCheckedChange={(checked) => toggleTechnician.mutate({ id: technician._id, payload: { isActive: checked ?? false } })} />
                      <Button variant="outline" size="sm" onClick={() => deleteTechnician.mutate(technician._id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card id="tickets" className="shadow-none">
              <CardHeader>
                <CardTitle>Tickets</CardTitle>
                <CardDescription>Current property support work.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticketsList.length === 0 ? (
                  <Empty><EmptyHeader><EmptyMedia variant="icon"><Bell /></EmptyMedia><EmptyTitle>No tickets</EmptyTitle><EmptyDescription>Resident and worker tickets show here.</EmptyDescription></EmptyHeader></Empty>
                ) : ticketsList.slice(0, 8).map((ticket) => (
                  <div key={ticket._id} className="rounded-xl border p-3">
                    <p className="font-medium text-slate-950">{ticket.title}</p>
                    <p className="text-xs text-slate-600">{ticket.priority} â€¢ {ticket.status}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Occupancy snapshot</CardTitle>
                <CardDescription>Quick unit status totals.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vacant</TableHead>
                      <TableHead>Occupied</TableHead>
                      <TableHead>Maintenance</TableHead>
                      <TableHead>Reserved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{occupancy.data?.vacant ?? 0}</TableCell>
                      <TableCell>{occupancy.data?.occupied ?? 0}</TableCell>
                      <TableCell>{occupancy.data?.maintenance ?? 0}</TableCell>
                      <TableCell>{occupancy.data?.reserved ?? 0}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Ops pipeline</CardTitle>
                <CardDescription>Vendors, tickets, recurring plans, inspections.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <div className="flex items-center gap-2 text-slate-700"><BriefcaseBusiness className="size-4" /> Vendors</div>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{vendorsList.length}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="flex items-center gap-2 text-slate-700"><ClipboardCheck className="size-4" /> Tickets in progress</div>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{ticketsList.filter((item) => item.status === "in_progress").length}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="flex items-center gap-2 text-slate-700"><Repeat className="size-4" /> Recurring</div>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{recurringList.length}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="flex items-center gap-2 text-slate-700"><ClipboardCheck className="size-4" /> Inspections</div>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{inspectionsList.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notices" className="space-y-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Notices</CardTitle>
              <CardDescription>Owner notices to guests, renters, workers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcementsList.length === 0 ? (
                <Empty><EmptyHeader><EmptyMedia variant="icon"><Bell /></EmptyMedia><EmptyTitle>No notices</EmptyTitle><EmptyDescription>Send first notice from owner controls.</EmptyDescription></EmptyHeader></Empty>
              ) : announcementsList.slice(0, 8).map((notice) => (
                <div key={notice._id} className="rounded-xl border p-3">
                  <p className="font-medium text-slate-950">{notice.title}</p>
                  <p className="text-xs text-slate-600">{notice.audience ?? "general"}</p>
                  <p className="mt-2 text-sm text-slate-700">{notice.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
