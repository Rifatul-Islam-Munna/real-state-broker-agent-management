"use client"

import { useState } from "react"
import { Ban, CalendarPlus, CirclePlus, Pencil, Power, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  createPlanAction,
  createTenantAction,
  deletePlanAction,
  deleteTenantAction,
  extendTenantSubscriptionAction,
  setPlanStatusAction,
  setTenantBlockedAction,
  updatePlanAction,
} from "@/lib/super-admin-actions"

type Plan = { id:number; name:string; description:string; price:string; billingDays:number; dashboardPermissions:string[]; isActive:boolean }
type Tenant = { id:number; businessName:string; isBlocked:boolean; subscriptionExpiresAt:string|null }
const fieldLabel = "grid gap-2 text-sm font-medium text-[#17243a]"

function ModalSubmit({ children }: { children: React.ReactNode }) {
  return <Button className="min-w-32" type="submit">{children}</Button>
}

export function CreateTenantDialog({ plans, primaryDomain }: { plans: Plan[]; primaryDomain: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}><CirclePlus />New tenant</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create tenant workspace</DialogTitle>
          <DialogDescription>Provision the owner account, subscription and isolated tenant database from one guided form.</DialogDescription>
        </DialogHeader>
        <form action={createTenantAction} className="grid gap-4 md:grid-cols-2">
          <label className={fieldLabel}>Business name<Input name="businessName" placeholder="Northstar Realty" required /></label>
          <label className={fieldLabel}>Preferred subdomain<Input name="requestedSubdomain" placeholder={`northstar.${primaryDomain}`} /></label>
          <label className={fieldLabel}>Subscription plan<select className="h-10 rounded-xl border border-input bg-card px-3.5 text-sm" name="planId" required defaultValue=""><option disabled value="">Choose a plan</option>{plans.filter((p)=>p.isActive).map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className={fieldLabel}>Owner email<Input name="email" type="email" placeholder="owner@company.com" required /></label>
          <label className={fieldLabel}>First name<Input name="firstName" placeholder="Avery" required /></label>
          <label className={fieldLabel}>Last name<Input name="lastName" placeholder="Morgan" required /></label>
          <label className={fieldLabel}>Phone<Input name="phone" placeholder="+1 555 000 0000" /></label>
          <label className={fieldLabel}>Temporary password<Input minLength={8} name="password" type="password" placeholder="Minimum 8 characters" required /></label>
          <div className="md:col-span-2 rounded-xl bg-[#f4f6fa] p-4 text-xs leading-5 text-[#657084]">If the subdomain is blank, the platform generates one automatically. The owner password is never shown again after creation.</div>
          <DialogFooter className="md:col-span-2"><ModalSubmit>Create tenant</ModalSubmit></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ExtendTenantDialog({ tenant }: { tenant: Tenant }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}><CalendarPlus />Extend</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Extend subscription</DialogTitle><DialogDescription>Add time to {tenant.businessName}&apos;s current subscription.</DialogDescription></DialogHeader>
        <form action={extendTenantSubscriptionAction} className="grid gap-4">
          <input name="id" type="hidden" value={tenant.id} />
          <label className={fieldLabel}>Days to add<Input defaultValue="30" max="3650" min="1" name="days" type="number" required /></label>
          <DialogFooter><ModalSubmit>Extend subscription</ModalSubmit></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export function DeleteTenantDialog({ tenant }: { tenant: Tenant }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" />}><Trash2 />Delete</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Delete {tenant.businessName}?</DialogTitle><DialogDescription>This permanently deletes the tenant database, tenant users, domain records and workspace. Type the business name exactly to confirm.</DialogDescription></DialogHeader>
        <form action={deleteTenantAction} className="grid gap-4">
          <input name="id" type="hidden" value={tenant.id} />
          <label className={fieldLabel}>Confirm business name<Input name="confirmation" placeholder={tenant.businessName} required /></label>
          <DialogFooter><Button type="submit" variant="destructive">Permanently delete tenant</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TenantBlockDialog({ tenant }: { tenant: Tenant }) {
  const nextBlocked = !tenant.isBlocked
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant={nextBlocked ? "destructive" : "outline"} />}><Ban />{nextBlocked ? "Block" : "Unblock"}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{nextBlocked ? "Block tenant access?" : "Restore tenant access?"}</DialogTitle><DialogDescription>{nextBlocked ? `${tenant.businessName} will be prevented from using tenant services until restored.` : `${tenant.businessName} will regain access immediately.`}</DialogDescription></DialogHeader>
        <form action={setTenantBlockedAction}>
          <input name="id" type="hidden" value={tenant.id} /><input name="isBlocked" type="hidden" value={String(nextBlocked)} />
          <DialogFooter><Button type="submit" variant={nextBlocked ? "destructive" : "default"}>{nextBlocked ? "Block tenant" : "Restore access"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PermissionFields({ defaults = [] }: { defaults?: string[] }) {
  return <div className="grid gap-3 rounded-xl border bg-[#f8f9fc] p-4 sm:grid-cols-2"><label className="flex items-center gap-3 text-sm"><input defaultChecked={defaults.includes("normal-dashboard")} name="dashboardPermissions" type="checkbox" value="normal-dashboard" />CRM dashboard</label><label className="flex items-center gap-3 text-sm"><input defaultChecked={defaults.includes("property-management-dashboard")} name="dashboardPermissions" type="checkbox" value="property-management-dashboard" />Property operations</label></div>
}

export function CreatePlanDialog() {
  return <Dialog><DialogTrigger render={<Button size="lg" />}><CirclePlus />New plan</DialogTrigger><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Create subscription plan</DialogTitle><DialogDescription>Define pricing, billing cadence and tenant dashboard access.</DialogDescription></DialogHeader><form action={createPlanAction} className="grid gap-4"><label className={fieldLabel}>Plan name<Input name="name" placeholder="Growth" required /></label><div className="grid gap-4 sm:grid-cols-2"><label className={fieldLabel}>Price<Input min="0" name="price" step="0.01" type="number" required /></label><label className={fieldLabel}>Billing days<Input defaultValue="30" min="1" name="billingDays" type="number" required /></label></div><label className={fieldLabel}>Description<Input name="description" placeholder="Best for growing brokerages" /></label><PermissionFields /><DialogFooter><ModalSubmit>Create plan</ModalSubmit></DialogFooter></form></DialogContent></Dialog>
}
export function EditPlanDialog({ plan }: { plan: Plan }) {
  return <Dialog><DialogTrigger render={<Button size="sm" variant="outline" />}><Pencil />Edit</DialogTrigger><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit {plan.name}</DialogTitle><DialogDescription>Update plan details without leaving the plan list.</DialogDescription></DialogHeader><form action={updatePlanAction} className="grid gap-4"><input name="id" type="hidden" value={plan.id} /><label className={fieldLabel}>Plan name<Input defaultValue={plan.name} name="name" required /></label><div className="grid gap-4 sm:grid-cols-2"><label className={fieldLabel}>Price<Input defaultValue={plan.price} min="0" name="price" step="0.01" type="number" required /></label><label className={fieldLabel}>Billing days<Input defaultValue={plan.billingDays} min="1" name="billingDays" type="number" required /></label></div><label className={fieldLabel}>Description<Input defaultValue={plan.description} name="description" /></label><PermissionFields defaults={plan.dashboardPermissions} /><DialogFooter><ModalSubmit>Save changes</ModalSubmit></DialogFooter></form></DialogContent></Dialog>
}

export function PlanStatusDialog({ plan }: { plan: Plan }) {
  const activate = !plan.isActive
  return <Dialog><DialogTrigger render={<Button size="sm" variant="outline" />}><Power />{activate ? "Activate" : "Deactivate"}</DialogTrigger><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{activate ? "Activate" : "Deactivate"} {plan.name}?</DialogTitle><DialogDescription>{activate ? "The plan will become available for new tenant subscriptions." : "Existing tenant assignments remain, but the plan will no longer be offered for new subscriptions."}</DialogDescription></DialogHeader><form action={setPlanStatusAction}><input name="id" type="hidden" value={plan.id}/><input name="isActive" type="hidden" value={String(activate)}/><DialogFooter><ModalSubmit>{activate ? "Activate plan" : "Deactivate plan"}</ModalSubmit></DialogFooter></form></DialogContent></Dialog>
}

export function DeletePlanDialog({ plan }: { plan: Plan }) {
  return <Dialog><DialogTrigger render={<Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" />}><Trash2 />Delete</DialogTrigger><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Delete {plan.name}?</DialogTitle><DialogDescription>This action should only be used for plans that are no longer referenced. It cannot be undone.</DialogDescription></DialogHeader><form action={deletePlanAction}><input name="id" type="hidden" value={plan.id}/><DialogFooter><Button type="submit" variant="destructive">Delete plan</Button></DialogFooter></form></DialogContent></Dialog>
}
