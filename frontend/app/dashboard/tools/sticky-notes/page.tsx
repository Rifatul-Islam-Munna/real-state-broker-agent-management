"use client"

import { useEffect, useState } from "react"
import { Grip, Plus, StickyNote, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Note = { id: number; title: string; body: string; x: number; y: number; color: string }
const styles: Record<string, string> = { amber: "border-amber-300 bg-amber-100 text-amber-950", blue: "border-sky-300 bg-sky-100 text-sky-950", green: "border-emerald-300 bg-emerald-100 text-emerald-950", rose: "border-rose-300 bg-rose-100 text-rose-950" }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${url}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } })
  if (!response.ok) throw new Error(await response.text() || "Request failed")
  return response.status === 204 ? undefined as T : response.json()
}

export default function StickyNotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null)

  useEffect(() => { api<Note[]>("/tools/sticky-notes").then(setNotes).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    if (!dragging) return
    const move = (event: PointerEvent) => {
      const board = document.getElementById("sticky-note-board")
      if (!board) return
      const bounds = board.getBoundingClientRect()
      const x = Math.max(0, Math.min(event.clientX - bounds.left - dragging.offsetX, bounds.width - 224))
      const y = Math.max(0, Math.min(event.clientY - bounds.top - dragging.offsetY, bounds.height - 180))
      setNotes((items) => items.map((note) => note.id === dragging.id ? { ...note, x, y } : note))
    }
    const stop = () => {
      const note = notes.find((item) => item.id === dragging.id)
      if (note) void api(`/tools/sticky-notes/${note.id}`, { method: "PATCH", body: JSON.stringify({ x: note.x, y: note.y }) })
      setDragging(null)
    }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop)
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop) }
  }, [dragging, notes])

  async function addNote() {
    const colors = ["amber", "blue", "green", "rose"]
    const created = await api<Note>("/tools/sticky-notes", { method: "POST", body: JSON.stringify({ title: "New note", body: "Add a client request, property detail, or follow-up.", x: 24 + notes.length * 18, y: 24 + notes.length * 18, color: colors[notes.length % colors.length] }) })
    setNotes((items) => [...items, created])
  }

  async function update(note: Note, patch: Partial<Note>) {
    const next = { ...note, ...patch }
    setNotes((items) => items.map((item) => item.id === note.id ? next : item))
    await api(`/tools/sticky-notes/${note.id}`, { method: "PATCH", body: JSON.stringify(patch) })
  }

  async function remove(id: number) {
    await api(`/tools/sticky-notes/${id}`, { method: "DELETE" })
    setNotes((items) => items.filter((item) => item.id !== id))
  }

  return <div className="space-y-6 p-4 md:p-6">
    <div><h1 className="text-3xl font-bold tracking-tight">Sticky Notes</h1><p className="mt-1 text-muted-foreground">Saved to your account so your board is available when you return.</p></div>
    <Card><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Agent note board</CardTitle><CardDescription>Drag notes anywhere. Changes are stored in the backend.</CardDescription></div><Button onClick={() => void addNote()}><Plus className="mr-2 size-4"/>Add note</Button></CardHeader>
      <CardContent><div id="sticky-note-board" className="relative min-h-[650px] overflow-hidden rounded-2xl border bg-muted/35">
        {!loading && notes.length === 0 && <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground"><StickyNote className="mb-3 size-10"/><p>No saved notes yet.</p></div>}
        {notes.map((note) => <div key={note.id} className={`absolute w-56 rounded-xl border p-3 shadow-md ${styles[note.color] || styles.amber}`} style={{ transform: `translate(${note.x}px, ${note.y}px)` }}>
          <div className="mb-2 flex cursor-grab items-center justify-between border-b border-current/15 pb-2" onPointerDown={(event) => { const bounds = event.currentTarget.parentElement?.getBoundingClientRect(); if (bounds) setDragging({ id: note.id, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top }) }}><Grip className="size-4 opacity-60"/><Button size="icon-sm" variant="ghost" onClick={() => void remove(note.id)}><Trash2 className="size-4"/></Button></div>
          <Input className="mb-2 border-0 bg-transparent px-1 font-semibold shadow-none focus-visible:ring-0" value={note.title} onChange={(e) => setNotes((items) => items.map((item) => item.id === note.id ? { ...item, title: e.target.value } : item))} onBlur={() => void update(note, { title: notes.find((item) => item.id === note.id)?.title || note.title })}/>
          <Textarea className="min-h-24 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" value={note.body} onChange={(e) => setNotes((items) => items.map((item) => item.id === note.id ? { ...item, body: e.target.value } : item))} onBlur={() => void update(note, { body: notes.find((item) => item.id === note.id)?.body || "" })}/>
        </div>)}
      </div></CardContent>
    </Card>
  </div>
}
