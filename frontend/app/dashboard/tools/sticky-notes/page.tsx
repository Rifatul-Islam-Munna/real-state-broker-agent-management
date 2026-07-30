"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Grip, Plus, Save, StickyNote, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Note = {
  id: number
  title: string
  body: string
  x: number
  y: number
  color: string
}

const styles: Record<string, string> = {
  amber: "border-amber-300 bg-amber-100 text-amber-950",
  blue: "border-sky-300 bg-sky-100 text-sky-950",
  green: "border-emerald-300 bg-emerald-100 text-emerald-950",
  rose: "border-rose-300 bg-rose-100 text-rose-950",
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${url}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  if (!response.ok) throw new Error((await response.text()) || "Request failed")
  return response.status === 204 ? (undefined as T) : response.json()
}

export default function StickyNotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<{
    id: number
    offsetX: number
    offsetY: number
  } | null>(null)

  useEffect(() => {
    api<Note[]>("/tools/sticky-notes")
      .then(setNotes)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!dragging) return
    const move = (event: PointerEvent) => {
      const board = document.getElementById("sticky-note-board")
      if (!board) return
      const bounds = board.getBoundingClientRect()
      const x = Math.max(
        0,
        Math.min(event.clientX - bounds.left - dragging.offsetX, bounds.width - 224)
      )
      const y = Math.max(
        0,
        Math.min(event.clientY - bounds.top - dragging.offsetY, bounds.height - 180)
      )
      setNotes((items) =>
        items.map((note) => (note.id === dragging.id ? { ...note, x, y } : note))
      )
    }
    const stop = () => {
      const note = notes.find((item) => item.id === dragging.id)
      if (note) {
        void api(`/tools/sticky-notes/${note.id}`, {
          method: "PATCH",
          body: JSON.stringify({ x: note.x, y: note.y }),
        })
      }
      setDragging(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", stop)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", stop)
    }
  }, [dragging, notes])

  async function addNote() {
    const colors = ["amber", "blue", "green", "rose"]
    const created = await api<Note>("/tools/sticky-notes", {
      method: "POST",
      body: JSON.stringify({
        title: "New note",
        body: "Add a client request, property detail, or follow-up.",
        x: 24 + notes.length * 18,
        y: 24 + notes.length * 18,
        color: colors[notes.length % colors.length],
      }),
    })
    setNotes((items) => [...items, created])
  }

  async function update(note: Note, patch: Partial<Note>) {
    const next = { ...note, ...patch }
    setNotes((items) => items.map((item) => (item.id === note.id ? next : item)))
    await api(`/tools/sticky-notes/${note.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
  }

  async function remove(id: number) {
    await api(`/tools/sticky-notes/${id}`, { method: "DELETE" })
    setNotes((items) => items.filter((item) => item.id !== id))
  }

  return (
    <main className="min-h-full bg-[#f8f9ff] px-4 py-6 text-[#0b1c30] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-8">
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4343d5]"
            href="/dashboard/tools"
          >
            <ArrowLeft className="size-4" /> Back to Tools
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#4343d5]">
                <StickyNote className="size-4" /> Personal workspace
              </div>
              <h1 className="text-[36px] font-bold leading-tight tracking-[-0.03em]">
                Sticky Notes
              </h1>
              <p className="mt-2 text-[15px] text-[#464555]">
                Keep client requests, property details, and follow-ups arranged visually.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-2xl border border-[#c7c4d7] bg-white px-4 py-3 text-xs text-[#006b5f] shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:flex">
                <Save className="size-4" />
                <span className="font-bold">Changes save automatically</span>
              </div>
              <Button
                className="h-11 rounded-xl bg-[#4343d5] px-5 font-bold text-white shadow-lg shadow-[#4343d5]/20 hover:bg-[#3737bd]"
                onClick={() => void addNote()}
              >
                <Plus className="mr-2 size-4" /> Add note
              </Button>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[24px] border border-[#c7c4d7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-3 border-b border-[#c7c4d7] bg-[#eff4ff] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Agent note board</h2>
              <p className="mt-1 text-xs text-[#464555]">
                Drag notes anywhere on the board. Edits and positions are stored in the backend.
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#4343d5]">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
          </div>

          <div className="p-4 sm:p-6">
            <div
              className="relative min-h-[680px] overflow-hidden rounded-2xl border border-[#d7dbe5] bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:28px_28px] bg-[#f9fafb]"
              id="sticky-note-board"
            >
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[#464555]">
                  Loading notes…
                </div>
              ) : null}

              {!loading && notes.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-[#464555]">
                  <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#eff0ff] text-[#4343d5]">
                    <StickyNote className="size-7" />
                  </span>
                  <p className="text-lg font-bold text-[#0b1c30]">No saved notes yet</p>
                  <p className="mt-2 max-w-sm text-sm leading-6">
                    Add your first note to start building a flexible workspace for daily follow-ups.
                  </p>
                </div>
              ) : null}

              {notes.map((note) => (
                <div
                  className={`absolute w-56 rounded-2xl border p-3 shadow-[0_12px_24px_rgba(11,28,48,0.12)] ${
                    styles[note.color] || styles.amber
                  }`}
                  key={note.id}
                  style={{ transform: `translate(${note.x}px, ${note.y}px)` }}
                >
                  <div
                    className="mb-2 flex cursor-grab items-center justify-between border-b border-current/15 pb-2 active:cursor-grabbing"
                    onPointerDown={(event) => {
                      const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
                      if (bounds) {
                        setDragging({
                          id: note.id,
                          offsetX: event.clientX - bounds.left,
                          offsetY: event.clientY - bounds.top,
                        })
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.05em] opacity-60">
                      <Grip className="size-4" /> Drag
                    </div>
                    <button
                      aria-label="Delete note"
                      className="flex size-7 items-center justify-center rounded-lg transition hover:bg-black/10"
                      onClick={() => void remove(note.id)}
                      type="button"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <Input
                    className="mb-2 border-0 bg-transparent px-1 text-sm font-bold shadow-none focus-visible:ring-0"
                    onBlur={() =>
                      void update(note, {
                        title: notes.find((item) => item.id === note.id)?.title || note.title,
                      })
                    }
                    onChange={(event) =>
                      setNotes((items) =>
                        items.map((item) =>
                          item.id === note.id ? { ...item, title: event.target.value } : item
                        )
                      )
                    }
                    value={note.title}
                  />
                  <Textarea
                    className="min-h-28 resize-none border-0 bg-transparent px-1 text-xs leading-5 shadow-none focus-visible:ring-0"
                    onBlur={() =>
                      void update(note, {
                        body: notes.find((item) => item.id === note.id)?.body || "",
                      })
                    }
                    onChange={(event) =>
                      setNotes((items) =>
                        items.map((item) =>
                          item.id === note.id ? { ...item, body: event.target.value } : item
                        )
                      )
                    }
                    value={note.body}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
