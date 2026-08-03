import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { createTenantLeadAction, getTenantLeads } from "@/lib/tenant-dashboard-actions"

export default async function Page() {
  await requireDashboardAccess("lead")
  const leads = await getTenantLeads()
  return <main className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8 lg:p-10"><header><h1 className="text-3xl font-bold">Lead CRM</h1><p className="mt-2 text-sm text-slate-600">Leads are isolated inside your tenant database.</p></header>
  <form action={createTenantLeadAction} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-3"><input className="h-12 rounded-xl border px-4" name="fullName" placeholder="Full name" required/><input className="h-12 rounded-xl border px-4" name="email" placeholder="Email" type="email"/><input className="h-12 rounded-xl border px-4" name="phone" placeholder="Phone"/><button className="h-12 rounded-xl bg-[#4343d5] px-5 font-semibold text-white md:col-span-3">Add lead</button></form>
  <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Phone</th><th className="px-5 py-4">Status</th></tr></thead><tbody>{leads.length ? leads.map(lead=><tr className="border-t" key={lead.id}><td className="px-5 py-4 font-semibold">{lead.full_name}</td><td className="px-5 py-4">{lead.email ?? "-"}</td><td className="px-5 py-4">{lead.phone ?? "-"}</td><td className="px-5 py-4">{lead.status}</td></tr>) : <tr><td className="px-5 py-10 text-center text-slate-500" colSpan={4}>No tenant leads yet.</td></tr>}</tbody></table></div></div></main>
}
