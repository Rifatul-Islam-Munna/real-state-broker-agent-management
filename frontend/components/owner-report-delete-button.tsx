"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Trash2, TriangleAlert, X } from "lucide-react"

import { deleteTenantOwnerReport } from "@/lib/tenant-dashboard-actions"

export function OwnerReportDeleteButton({
  reportId,
  reportSubject,
  returnToHistory = false,
}: {
  reportId: number
  reportSubject: string
  returnToHistory?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function confirmDelete() {
    if (isPending) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteTenantOwnerReport(reportId)
        dialogRef.current?.close()
        if (returnToHistory) router.replace("/dashboard/owner-reports")
        router.refresh()
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not delete this report. Please retry.",
        )
      }
    })
  }

  return (
    <>
      <button
        aria-label={`Delete report #${reportId}`}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition-colors hover:border-rose-400 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600"
        onClick={() => {
          setError(null)
          dialogRef.current?.showModal()
        }}
        type="button"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete
      </button>

      <dialog
        aria-labelledby={`delete-owner-report-title-${reportId}`}
        aria-modal="true"
        className="fixed inset-0 m-auto w-[min(92vw,440px)] max-w-none rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
        onCancel={(event) => {
          if (isPending) event.preventDefault()
        }}
        ref={dialogRef}
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <TriangleAlert className="size-5" />
            </span>
            <button
              aria-label="Close deletion confirmation"
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>
          <h2
            className="mt-4 text-xl font-bold tracking-tight"
            id={`delete-owner-report-title-${reportId}`}
          >
            Delete this owner report?
          </h2>
          <p className="mt-2 break-words text-sm font-medium text-slate-800">
            {reportSubject || `Report #${reportId}`}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This removes the report from history and cancels any unsent queued
            emails or SMS. Messages already delivered cannot be recalled.
          </p>
          {error ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              Keep report
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={confirmDelete}
              type="button"
            >
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {isPending ? "Deleting…" : "Delete report"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
