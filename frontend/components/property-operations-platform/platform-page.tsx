"use client"

import { TenantOwnerDashboard } from "@/components/property-operations-platform/tenant-owner-dashboard"
import { PropertyOperationsPublicLinksPage } from "@/components/property-operations-platform/public-links-page"
import { PropertyOperationsAiPage, PropertyOperationsPlanPage } from "@/components/property-operations-platform/special-pages"
import { PropertyOperationsPropertiesImportPage } from "@/components/property-operations-platform/properties-import-page"
import {
  TenantOwnerAssetsPage,
  TenantOwnerBillingPage,
  TenantOwnerDocumentsPage,
  TenantOwnerFinancePage,
  TenantOwnerHealthPage,
  TenantOwnerInspectionsPage,
  TenantOwnerLeasesPage,
  TenantOwnerNoticesPage,
  TenantOwnerNotificationsPage,
  TenantOwnerPropertiesPage,
  TenantOwnerRecurringPage,
  TenantOwnerReportsPage,
  TenantOwnerSettingsPage,
  TenantOwnerStaffPage,
  TenantOwnerTeamPage,
  TenantOwnerTechniciansPage,
  TenantOwnerTenantsPage,
  TenantOwnerTicketsPage,
  TenantOwnerUnitsPage,
  TenantOwnerUsersPage,
  TenantOwnerVendorQuotesPage,
  TenantOwnerVendorsPage,
  TenantOwnerWorkOrdersPage,
} from "@/components/property-operations-platform/tenant-owner-pages"

const pages: Record<string, React.ComponentType> = {
  properties: PropertyOperationsPropertiesImportPage,
  units: TenantOwnerUnitsPage,
  users: TenantOwnerUsersPage,
  team: TenantOwnerTeamPage,
  tenants: TenantOwnerTenantsPage,
  leases: TenantOwnerLeasesPage,
  health: TenantOwnerHealthPage,
  staff: TenantOwnerStaffPage,
  finance: TenantOwnerFinancePage,
  billing: TenantOwnerBillingPage,
  technicians: TenantOwnerTechniciansPage,
  notices: TenantOwnerNoticesPage,
  documents: TenantOwnerDocumentsPage,
  vendors: TenantOwnerVendorsPage,
  assets: TenantOwnerAssetsPage,
  quotes: TenantOwnerVendorQuotesPage,
  notifications: TenantOwnerNotificationsPage,
  reports: TenantOwnerReportsPage,
  tickets: TenantOwnerTicketsPage,
  "work-orders": TenantOwnerWorkOrdersPage,
  recurring: TenantOwnerRecurringPage,
  inspections: TenantOwnerInspectionsPage,
  settings: TenantOwnerSettingsPage,
  "public-links": PropertyOperationsPublicLinksPage,
  payments: PropertyOperationsPublicLinksPage,
  plan: PropertyOperationsPlanPage,
  ai: PropertyOperationsAiPage,
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border bg-background p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Property Operations</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        This workspace uses the current agent/admin account and PostgreSQL records. Public participants use secure links and QR codes instead of dashboard accounts.
      </p>
    </section>
  )
}

export function PropertyOperationsPlatformPage({ slug }: { slug?: string }) {
  const normalized = slug?.toLowerCase() ?? ""
  const Page = normalized ? pages[normalized] : TenantOwnerDashboard

  return (
    <main className="w-full min-w-0 px-4 py-4 md:px-6 md:py-6 xl:px-8">
      <div className="w-full min-w-0">
        {Page ? <Page /> : <PlaceholderPage title={normalized.replaceAll("-", " ") || "Overview"} />}
      </div>
    </main>
  )
}
