"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Pencil, Plus, Trash2, X } from "lucide-react"

import type { PropertyOperationsModule } from "@/data/property-operations-modules"

const MODULE_RECORDS_KEY = "property-operations-module-records-v1"

type ImportedProperty = {
  id: number
  title: string
  location: string
}

type OperationRecord = {
  id: string
  title: string
  description: string
  recordType: string
  status: string
  priority: string
  amount: string
  dueDate: string
  contactName: string
  contactEmail: string
  contactPhone: string
  createdAt: string
  updatedAt: string
}

type OperationRecordStore = Record<string, Record<string, OperationRecord[]>>

type RecordForm = Omit<OperationRecord, "id" | "createdAt" | "updatedAt">

const emptyForm: RecordForm = {
  title: "",
  description: "",
  recordType: "Item",
  status: "Open",
  priority: "Normal",
  amount: "",
  dueDate: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
}

function readStore(): OperationRecordStore {
  if (typeof window === "undefined") return {}

  try {
    const value = window.localStorage.getItem(MODULE_RECORDS_KEY)
    return value ? (JSON.parse(value) as OperationRecordStore) : {}
  } catch {
    return {}
  }
}

function badgeClassName(value: string) {
  const normalized = value.toLowerCase()
  if (["completed", "closed", "paid", "approved", "active"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
  if (["urgent", "high", "overdue", "blocked", "rejected"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700"
  }
  if (["pending", "scheduled", "in progress", "review"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }
  return "border-border bg-muted/30 text-muted-foreground"
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function ModuleWorkspaceDialog({
  module,
  onClose,
  property,
}: {
  module: PropertyOperationsModule | null
  onClose: () => void
  property: ImportedProperty | null
}) {
  const [store, setStore] = useState<OperationRecordStore>({})
  const [form, setForm] = useState<RecordForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")

  useEffect(() => {
    setStore(readStore())
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(MODULE_RECORDS_KEY, JSON.stringify(store))
  }, [store])

  useEffect(() => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setSearch("")
    setStatusFilter("All")
  }, [module?.id, property?.id])

  const records = useMemo(() => {
    if (!property || !module) return []
    return store[String(property.id)]?.[module.id] ?? []
  }, [module, property, store])

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    return records.filter((record) => {
      const matchesSearch =
        !query ||
        record.title.toLowerCase().includes(query) ||
        record.description.toLowerCase().includes(query) ||
        record.contactName.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "All" || record.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [records, search, statusFilter])

  const statuses = useMemo(
    () => ["All", ...Array.from(new Set(records.map((record) => record.status).filter(Boolean)))],
    [records],
  )

  if (!module || !property) return null

  function saveStore(nextRecords: OperationRecord[]) {
    setStore((current) => ({
      ...current,
      [String(property.id)]: {
        ...(current[String(property.id)] ?? {}),
        [module.id]: nextRecords,
      },
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const now = new Date().toISOString()

    if (editingId) {
      saveStore(
        records.map((record) =>
          record.id === editingId
            ? { ...record, ...form, title: form.title.trim(), updatedAt: now }
            : record,
        ),
      )
    } else {
      saveStore([
        {
          ...form,
          id: createId(),
          title: form.title.trim(),
          description: form.description.trim(),
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim().toLowerCase(),
          contactPhone: form.contactPhone.trim(),
          createdAt: now,
          updatedAt: now,
        },
        ...records,
      ])
    }

    resetForm()
  }

  function editRecord(record: OperationRecord) {
    const { id, createdAt, updatedAt, ...values } = record
    void id
    void createdAt
    void updatedAt
    setForm(values)
    setEditingId(record.id)
    setShowForm(true)
  }

  function deleteRecord(recordId: string) {
    saveStore(records.filter((record) => record.id !== recordId))
    if (editingId === recordId) resetForm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border bg-background md:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b p-5 md:p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{property.title}</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">{module.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{property.location}</p>
          </div>
          <button
            aria-label="Close module workspace"
            className="rounded-xl border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-h-0 overflow-y-auto p-4 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Operational records</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use this workspace for {module.description.toLowerCase()}
                </p>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                  setShowForm(true)
                }}
                type="button"
              >
                <Plus className="size-4" /> Add record
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <input
                className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records..."
                value={search}
              />
              <select
                className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {visibleRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center">
                  <p className="text-sm font-semibold text-foreground">No records yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add the first {module.label.toLowerCase()} record for this property.
                  </p>
                </div>
              ) : null}

              {visibleRecords.map((record) => (
                <article className="rounded-2xl border bg-background p-4" key={record.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-semibold text-foreground">{record.title}</h4>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeClassName(record.status)}`}>
                          {record.status}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeClassName(record.priority)}`}>
                          {record.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{record.recordType}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        aria-label={`Edit ${record.title}`}
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        onClick={() => editRecord(record)}
                        type="button"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        aria-label={`Delete ${record.title}`}
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                        onClick={() => deleteRecord(record.id)}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {record.description ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{record.description}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {record.dueDate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
                        <CalendarDays className="size-3.5" /> {record.dueDate}
                      </span>
                    ) : null}
                    {record.amount ? <span className="rounded-full border px-2.5 py-1">Amount: {record.amount}</span> : null}
                    {record.contactName ? <span className="rounded-full border px-2.5 py-1">{record.contactName}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className={`min-h-0 overflow-y-auto border-t bg-muted/20 p-4 md:border-l md:border-t-0 md:p-5 ${showForm ? "block" : "hidden md:block"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit record" : "New record"}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Fields are flexible across every operations module.</p>
              </div>
              {showForm ? (
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" onClick={resetForm} type="button">
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <label className="block text-xs font-medium text-foreground">
                Title
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  required
                  value={form.title}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-foreground">
                  Record type
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => setForm((current) => ({ ...current, recordType: event.target.value }))}
                    value={form.recordType}
                  />
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Status
                  <select
                    className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    value={form.status}
                  >
                    {['Open', 'Pending', 'Scheduled', 'In progress', 'Completed', 'Closed', 'Paid', 'Overdue'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-foreground">
                  Priority
                  <select
                    className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                    value={form.priority}
                  >
                    {['Low', 'Normal', 'High', 'Urgent'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Due date
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                    type="date"
                    value={form.dueDate}
                  />
                </label>
              </div>

              <label className="block text-xs font-medium text-foreground">
                Amount
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                  inputMode="decimal"
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="Optional"
                  value={form.amount}
                />
              </label>

              <label className="block text-xs font-medium text-foreground">
                Description and notes
                <textarea
                  className="mt-1.5 min-h-28 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  value={form.description}
                />
              </label>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-foreground">Related contact</p>
                <div className="mt-2 space-y-2">
                  <input
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                    placeholder="Name"
                    value={form.contactName}
                  />
                  <input
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                    placeholder="Email"
                    type="email"
                    value={form.contactEmail}
                  />
                  <input
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
                    onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                    placeholder="Phone"
                    value={form.contactPhone}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="h-10 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  type="submit"
                >
                  {editingId ? "Save changes" : "Create record"}
                </button>
                <button className="h-10 rounded-xl border px-4 text-sm font-medium" onClick={resetForm} type="button">
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </div>
  )
}
