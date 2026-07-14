// @ts-nocheck

export function DashboardCardSkeleton() {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 h-8 w-20 rounded bg-muted" />
      <div className="mt-2 h-3 w-32 rounded bg-muted" />
    </div>
  )
}

export function DashboardPanelSkeleton() {
  return (
    <div className="rounded-2xl border bg-background p-5">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="mt-3 h-8 w-64 rounded bg-muted" />
      <div className="mt-3 h-4 w-full rounded bg-muted" />
      <div className="mt-2 h-4 w-5/6 rounded bg-muted" />
    </div>
  )
}

export function DashboardTableSkeleton() {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-10 rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}

export function AuthFormSkeleton() {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_70px_rgba(37,99,235,0.16)] backdrop-blur sm:p-8">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-4 h-8 w-40 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-full rounded bg-slate-200" />
      <div className="mt-2 h-4 w-5/6 rounded bg-slate-200" />
      <div className="mt-6 space-y-4">
        <div className="h-12 rounded-xl bg-slate-200" />
        <div className="h-12 rounded-xl bg-slate-200" />
        <div className="h-12 rounded-xl bg-slate-200" />
      </div>
    </div>
  )
}

export function UploadFieldSkeleton() {
  return (
    <div className="rounded-xl border p-4">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="mt-4 h-12 rounded bg-muted" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="aspect-[4/3] rounded-xl bg-muted" />
        <div className="min-h-24 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

export function WithBone({
  name,
  loading,
  children,
  fallback,
}: {
  name: string
  loading: boolean
  children: React.ReactNode
  fallback: React.ReactNode
}) {
  void name
  return loading ? <>{fallback}</> : <>{children}</>
}
