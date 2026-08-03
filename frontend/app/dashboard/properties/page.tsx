import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { createTenantPropertyAction, getTenantProperties } from "@/lib/tenant-dashboard-actions"

export default async function Page() {
  await requireDashboardAccess("properties")
  const properties = await getTenantProperties()
  return <main className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8 lg:p-10"><header><h1 className="text-3xl font-bold">Properties</h1><p className="mt-2 text-sm text-slate-600">Stored only in your tenant database.</p></header>
  <form action={createTenantPropertyAction} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-[1fr_180px_auto]"><input className="h-12 rounded-xl border px-4" name="title" placeholder="Property title" required/><select className="h-12 rounded-xl border px-4" name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select><button className="h-12 rounded-xl bg-[#4343d5] px-5 font-semibold text-white">Add property</button></form>
  <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{properties.length ? properties.map(item=><article className="rounded-2xl border bg-white p-5 shadow-sm" key={item.id}><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.status}</span><h2 className="mt-4 text-lg font-bold">{item.title}</h2><p className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p></article>) : <p className="text-sm text-slate-500">No tenant properties yet.</p>}</section></main>
}
