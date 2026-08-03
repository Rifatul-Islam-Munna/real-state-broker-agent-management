import { createPlanAction, deletePlanAction, getPlans, setPlanStatusAction, updatePlanAction } from "@/lib/super-admin-actions"

type Plan = { id:number; name:string; description:string; price:string; billingDays:number; dashboardPermissions:string[]; isActive:boolean }
const input = "h-11 w-full rounded-lg border border-[#d7dbe5] px-3 text-sm outline-none focus:border-[#4343d5]"

export default async function PlansPage() {
  const plans = await getPlans() as Plan[]
  return <div className="mx-auto max-w-7xl space-y-8">
    <header><h1 className="text-3xl font-bold">Subscription plans</h1><p className="mt-2 text-sm text-[#646273]">Create unlimited plans and choose one or both dashboard permissions.</p></header>
    <form action={createPlanAction} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <input className={input} name="name" placeholder="Plan name" required />
      <input className={input} name="price" min="0" step="0.01" type="number" placeholder="Price" required />
      <input className={input} name="billingDays" min="1" type="number" defaultValue="30" required />
      <input className={input} name="description" placeholder="Description" />
      <label className="flex items-center gap-2 text-sm"><input name="dashboardPermissions" type="checkbox" value="normal-dashboard" /> Normal dashboard</label>
      <label className="flex items-center gap-2 text-sm"><input name="dashboardPermissions" type="checkbox" value="property-management-dashboard" /> Property-management dashboard</label>
      <button className="h-11 rounded-lg bg-[#4343d5] px-5 font-semibold text-white xl:col-span-2">Create plan</button>
    </form>
    <div className="space-y-5">
      {plans.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-[#646273]">No plans yet. Create the first plan above.</div> : plans.map(plan =>
        <article className="rounded-2xl border bg-white p-6 shadow-sm" key={plan.id}>
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold">{plan.name}</h2><p className="text-sm text-[#646273]">{plan.isActive ? "Active" : "Inactive"}</p></div><span className="rounded-full bg-[#eff0ff] px-3 py-1 text-xs font-semibold text-[#4343d5]">#{plan.id}</span></div>
          <form action={updatePlanAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input name="id" type="hidden" value={plan.id} />
            <input className={input} name="name" defaultValue={plan.name} required />
            <input className={input} name="price" min="0" step="0.01" type="number" defaultValue={plan.price} required />
            <input className={input} name="billingDays" min="1" type="number" defaultValue={plan.billingDays} required />
            <input className={input} name="description" defaultValue={plan.description} />
            <label className="flex items-center gap-2 text-sm"><input defaultChecked={plan.dashboardPermissions.includes("normal-dashboard")} name="dashboardPermissions" type="checkbox" value="normal-dashboard" /> Normal dashboard</label>
            <label className="flex items-center gap-2 text-sm"><input defaultChecked={plan.dashboardPermissions.includes("property-management-dashboard")} name="dashboardPermissions" type="checkbox" value="property-management-dashboard" /> Property management</label>
            <button className="h-11 rounded-lg border px-5 font-semibold xl:col-span-2">Save changes</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={setPlanStatusAction}><input name="id" type="hidden" value={plan.id}/><input name="isActive" type="hidden" value={String(!plan.isActive)}/><button className="rounded-lg border px-4 py-2 text-sm font-semibold">{plan.isActive ? "Deactivate" : "Activate"}</button></form>
            <form action={deletePlanAction}><input name="id" type="hidden" value={plan.id}/><button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Delete</button></form>
          </div>
        </article>)}
    </div>
  </div>
}
