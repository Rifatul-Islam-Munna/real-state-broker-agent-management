import {
  SuperAdminOverview,
  type SuperAdminLog,
  type SuperAdminPlan,
  type SuperAdminTenant,
} from "@/components/super-admin/super-admin-overview"
import {
  getAuditLogs,
  getPaymentSettings,
  getPlans,
  getPlatformDomain,
  getTenants,
} from "@/lib/super-admin-actions"

type Domain = { primaryDomain: string }
type Payment = {
  stripeSecretKeyConfigured: boolean
  stripeWebhookSecretConfigured: boolean
  stripePublishableKey: string
  stripeCurrency?: string
}

export default async function SuperAdminDashboardPage() {
  const [tenants, plans, logs, domain, payment] = await Promise.all([
    getTenants(), getPlans(), getAuditLogs(), getPlatformDomain(), getPaymentSettings(),
  ]) as [SuperAdminTenant[], SuperAdminPlan[], SuperAdminLog[], Domain, Payment]
  return (
    <SuperAdminOverview
      logs={logs}
      payment={payment}
      plans={plans}
      primaryDomain={domain.primaryDomain}
      tenants={tenants}
    />
  )
}
