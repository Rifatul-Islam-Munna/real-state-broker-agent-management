import { createTenantAction, extendTenantSubscriptionAction, getPlans, getTenants, setTenantBlockedAction } from "@/lib/super-admin-actions"

type Plan = { id:number; name:string; isActive:boolean }
type Tenant = { id:number; businessName:string; slug:string; subdomain:string; dashboardPermissions:string[]; isActive:boolean; isBlocked:boolean; provisioningStatus:string; subscriptionStartsAt:string|null; subscriptionExpiresAt:string|null; plan?:{name:string}|null }
const field = "h-11 rounded-lg border border-[#d7dbe5] px-3 text-sm outline-none focus:border-[#4343d5]"

export default async function TenantsPage() {
  const [tenants, plans] = await Promise.all([getTenants(), getPlans()]) as [Tenant[], Plan[]]
  return <div className="mx-auto max-w-7xl space-y-8">
    <header><h1 className="text-3xl font-bold">Customers and tenants</h1><p className="mt-2 text-sm text-[#646273]">Create tenants manually or manage subscriptions, status, and provisioning details.</p></header>

    <form action={createTenantAction} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <input className={field} name="businessName" placeholder="Business name" required />
      <input className={field} name="requestedSubdomain" placeholder="Preferred subdomain" />
      <select className={field} name="planId" required defaultValue=""><option disabled value="">Select active plan</option>{plans.filter(p=>p.isActive).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <input className={field} name="email" placeholder="Owner email" required type="email" />
      <input className={field} name="firstName" placeholder="Owner first name" required />
      <input className={field} name="lastName" placeholder="Owner last name" required />
      <input className={field} name="phone" placeholder="Phone" />
      <input className={field} minLength={8} name="password" placeholder="Temporary password" required type="password" />
      <button className="h-11 rounded-lg bg-[#4343d5] px-5 font-semibold text-white md:col-span-2 xl:col-span-4">Create tenant manually</button>
    </form>

    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f7f8fb] text-xs uppercase tracking-wide text-[#646273]"><tr><th className="px-5 py-4">Business</th><th className="px-5 py-4">Plan & permissions</th><th className="px-5 py-4">Subscription</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead><tbody>
      {tenants.length === 0 ? <tr><td className="px-5 py-10 text-center text-[#646273]" colSpan={5}>No tenants have been provisioned yet.</td></tr> : tenants.map(t => <tr className="border-t align-top" key={t.id}>
        <td className="px-5 py-4"><p className="font-semibold">{t.businessName}</p><p className="text-xs text-[#646273]">{t.slug} | {t.subdomain}</p></td>
        <td className="px-5 py-4"><p>{t.plan?.name ?? "No plan"}</p><p className="mt-1 text-xs text-[#646273]">{t.dashboardPermissions?.join(", ") || "No permissions"}</p></td>
        <td className="px-5 py-4"><p>Starts: {t.subscriptionStartsAt ? new Date(t.subscriptionStartsAt).toLocaleDateString() : "-"}</p><p>Expires: {t.subscriptionExpiresAt ? new Date(t.subscriptionExpiresAt).toLocaleDateString() : "-"}</p></td>
        <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${t.isBlocked ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{t.isBlocked ? "Blocked" : t.isActive ? "Active" : "Inactive"}</span><p className="mt-2 text-xs text-[#646273]">Provisioning: {t.provisioningStatus}</p></td>
        <td className="px-5 py-4"><div className="flex min-w-56 flex-col gap-3">
          <form action={setTenantBlockedAction}><input name="id" type="hidden" value={t.id}/><input name="isBlocked" type="hidden" value={String(!t.isBlocked)}/><button className="w-full rounded-lg border px-3 py-2 font-semibold">{t.isBlocked ? "Unblock tenant" : "Block tenant"}</button></form>
          <form action={extendTenantSubscriptionAction} className="flex gap-2"><input name="id" type="hidden" value={t.id}/><input className="min-w-0 flex-1 rounded-lg border px-3" min="1" max="3650" name="days" type="number" defaultValue="30" required/><button className="rounded-lg bg-[#4343d5] px-3 py-2 font-semibold text-white">Extend</button></form>
        </div></td>
      </tr>)}</tbody></table></div>
    </div>
  </div>
}


