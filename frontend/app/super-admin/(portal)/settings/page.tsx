import { CreditCard, Globe2, Network, ShieldCheck } from "lucide-react"

import { getPaymentSettings, getPlatformDomain, updatePaymentSettingsAction, updatePlatformDomainAction } from "@/lib/super-admin-actions"

type PlatformDomain = {
  primaryDomain: string
  frontendOrigin?: string
  updatedAt: string | null
  updatedByUserId: number | null
}

type PaymentSettings = {
  stripeSecretKeyConfigured: boolean
  stripeSecretKeySource: "database" | "environment" | "none"
  stripeWebhookSecretConfigured: boolean
  stripeWebhookSecretSource: "database" | "environment" | "none"
  stripePublishableKey: string
  stripeCurrency: string
}

export default async function SuperAdminSettingsPage() {
  const [settings, payment] = await Promise.all([getPlatformDomain(), getPaymentSettings()]) as [PlatformDomain, PaymentSettings]
  const primaryDomain = settings.primaryDomain || "localhost"
  const exampleSubdomain = `tenant-slug.${primaryDomain}`
  const webhookUrl = `${(settings.frontendOrigin || `http://${primaryDomain}:3000`).replace(/\/$/, "")}/api/public-saas/stripe-webhook`

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#646273]">Platform settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">Main domain and tenant routing</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#646273]">
          Set the root SaaS domain used by the Super Admin portal, public app, and automatically assigned tenant subdomains.
        </p>
      </header>

      <section className="rounded-2xl border border-[#dfe4ee] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eff0ff] text-[#4343d5]">
            <Globe2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">Primary SaaS domain</h2>
            <p className="mt-1 text-sm leading-6 text-[#646273]">
              Enter only the hostname, for example <strong>example.com</strong>. Do not include https://, a path, or a port.
            </p>
            <form action={updatePlatformDomainAction} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                className="h-11 min-w-0 flex-1 rounded-lg border border-[#d7dbe5] px-3 text-sm outline-none focus:border-[#4343d5]"
                defaultValue={primaryDomain}
                name="primaryDomain"
                placeholder="example.com"
                required
              />
              <button className="h-11 rounded-lg bg-[#4343d5] px-5 text-sm font-semibold text-white" type="submit">
                Save main domain
              </button>
            </form>
            {settings.updatedAt ? (
              <p className="mt-3 text-xs text-[#777586]">
                Last updated {new Date(settings.updatedAt).toLocaleString()}{settings.updatedByUserId ? ` by admin #${settings.updatedByUserId}` : ""}.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#dfe4ee] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eff0ff] text-[#4343d5]">
            <CreditCard className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">Stripe payments</h2>
            <p className="mt-1 text-sm leading-6 text-[#646273]">Save Stripe credentials here. Secret values are encrypted at rest and are never returned to this page.</p>
            <form action={updatePaymentSettingsAction} className="mt-5 grid gap-4 md:grid-cols-2">
              <input className="h-11 rounded-lg border border-[#d7dbe5] px-3 text-sm" name="stripeSecretKey" placeholder={payment.stripeSecretKeyConfigured ? `Secret key configured (${payment.stripeSecretKeySource})` : "sk_test_... or sk_live_..."} type="password" />
              <input className="h-11 rounded-lg border border-[#d7dbe5] px-3 text-sm" name="stripeWebhookSecret" placeholder={payment.stripeWebhookSecretConfigured ? `Webhook secret configured (${payment.stripeWebhookSecretSource})` : "whsec_..."} type="password" />
              <input className="h-11 rounded-lg border border-[#d7dbe5] px-3 text-sm" defaultValue={payment.stripePublishableKey} name="stripePublishableKey" placeholder="pk_test_... or pk_live_..." />
              <input className="h-11 rounded-lg border border-[#d7dbe5] px-3 text-sm uppercase" defaultValue={payment.stripeCurrency || "usd"} maxLength={3} name="stripeCurrency" placeholder="USD" />
              <label className="flex items-center gap-2 text-xs text-[#646273]"><input name="clearStripeSecretKey" type="checkbox" /> Clear stored secret key</label>
              <label className="flex items-center gap-2 text-xs text-[#646273]"><input name="clearStripeWebhookSecret" type="checkbox" /> Clear stored webhook secret</label>
              <button className="h-11 rounded-lg bg-[#4343d5] px-5 text-sm font-semibold text-white md:col-span-2" type="submit">Save Stripe settings</button>
            </form>
            <p className="mt-4 text-xs leading-5 text-[#777586]">Webhook endpoint: <strong className="break-all">{webhookUrl}</strong>. Configure Stripe to send Checkout completion events there.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-[#dfe4ee] bg-white p-6 shadow-sm">
          <Network className="size-6 text-[#4343d5]" />
          <h2 className="mt-4 font-bold">Wildcard DNS</h2>
          <p className="mt-2 text-sm leading-6 text-[#646273]">
            Point <strong>*.{primaryDomain}</strong> to the same frontend/load balancer as <strong>{primaryDomain}</strong>.
            New tenants then work without adding DNS records one by one.
          </p>
          <div className="mt-4 rounded-xl bg-[#f5f7fb] p-4 font-mono text-xs text-[#3f4050]">{exampleSubdomain}</div>
        </article>

        <article className="rounded-2xl border border-[#dfe4ee] bg-white p-6 shadow-sm">
          <ShieldCheck className="size-6 text-[#19713b]" />
          <h2 className="mt-4 font-bold">Automatic tenant isolation</h2>
          <p className="mt-2 text-sm leading-6 text-[#646273]">
            Tenant creation generates a unique slug/subdomain, creates the owner login, provisions the isolated tenant database,
            and routes that hostname to the tenant website and dashboard.
          </p>
        </article>
      </section>
    </div>
  )
}
