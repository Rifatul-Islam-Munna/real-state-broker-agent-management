"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

import type { BlogPostItem, BlogPostSaveInput } from "@/@types/real-estate-api"
import {
  useAdminBlogPosts,
  useCreateBlogPost,
  useDeleteBlogPost,
  useUpdateBlogPost,
} from "@/hooks/use-real-estate-api"
import { deleteUploadedAsset, uploadPropertyAsset } from "@/lib/upload-client"
import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const PAGE_SIZE = 10

type BlogModalState =
  | { mode: "create" }
  | { mode: "edit"; post: BlogPostItem }
  | null

type BlogFormValues = {
  title: string
  excerpt: string
  category: string
  coverImageUrl: string
  coverImageObjectName: string
  authorName: string
  readTimeMinutes: string
  isFeatured: boolean
  isPublished: boolean
  publishedAt: string
  tags: string
  highlights: string
  paragraphs: string
}

type BlogFormErrors = Partial<Record<keyof BlogFormValues | "form", string>>

function createEmptyBlogForm(): BlogFormValues {
  return {
    authorName: "",
    category: "",
    coverImageObjectName: "",
    coverImageUrl: "",
    excerpt: "",
    highlights: "",
    isFeatured: false,
    isPublished: true,
    paragraphs: "",
    publishedAt: "",
    readTimeMinutes: "5",
    tags: "",
    title: "",
  }
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return adjusted.toISOString().slice(0, 16)
}

function fromBlogPost(post: BlogPostItem): BlogFormValues {
  return {
    authorName: post.authorName ?? "",
    category: post.category ?? "",
    coverImageObjectName: post.coverImageObjectName ?? "",
    coverImageUrl: post.coverImageUrl ?? "",
    excerpt: post.excerpt ?? "",
    highlights: (post.highlights ?? []).join("\n"),
    isFeatured: post.isFeatured ?? false,
    isPublished: post.isPublished ?? true,
    paragraphs: (post.paragraphs ?? []).join("\n\n"),
    publishedAt: toDateTimeLocal(post.publishedAt),
    readTimeMinutes: `${post.readTimeMinutes ?? 5}`,
    tags: (post.tags ?? []).join("\n"),
    title: post.title ?? "",
  }
}

function splitMultiline(value: string, separator: RegExp = /\r?\n+/) {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
}

function validateBlogForm(values: BlogFormValues) {
  const errors: BlogFormErrors = {}

  if (values.title.trim().length === 0) {
    errors.title = "Title is required."
  }

  if (values.excerpt.trim().length < 20) {
    errors.excerpt = "Excerpt must be at least 20 characters."
  }

  if (values.category.trim().length === 0) {
    errors.category = "Category is required."
  }

  if (values.authorName.trim().length === 0) {
    errors.authorName = "Author name is required."
  }

  if (values.coverImageUrl.trim().length === 0) {
    errors.coverImageUrl = "Cover image is required."
  }

  const readTime = Number(values.readTimeMinutes)
  if (!Number.isFinite(readTime) || readTime < 1) {
    errors.readTimeMinutes = "Read time must be at least 1 minute."
  }

  if (splitMultiline(values.paragraphs, /\r?\n\s*\r?\n+/).length === 0) {
    errors.paragraphs = "Add at least one paragraph."
  }

  return errors
}

function toSaveInput(values: BlogFormValues): BlogPostSaveInput {
  return {
    authorName: values.authorName.trim(),
    category: values.category.trim(),
    coverImageObjectName: values.coverImageObjectName.trim() || null,
    coverImageUrl: values.coverImageUrl.trim(),
    excerpt: values.excerpt.trim(),
    highlights: splitMultiline(values.highlights),
    isFeatured: values.isFeatured,
    isPublished: values.isPublished,
    paragraphs: splitMultiline(values.paragraphs, /\r?\n\s*\r?\n+/),
    publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : null,
    readTimeMinutes: Math.max(1, Number(values.readTimeMinutes) || 1),
    tags: splitMultiline(values.tags, /[\r\n,]+/),
    title: values.title.trim(),
  }
}

function formatBlogDate(value?: string | null) {
  if (!value) {
    return "Draft"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Draft"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null
  }

  return <p className="text-xs font-semibold text-rose-600">{error}</p>
}

function StatusBadge({ isPublished }: { isPublished: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
        isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  )
}

type BlogEditorDialogProps = {
  initialValues: BlogFormValues
  isSubmitting: boolean
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: BlogFormValues) => Promise<void>
  open: boolean
}

function BlogEditorDialog({
  initialValues,
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
}: BlogEditorDialogProps) {
  const [formValues, setFormValues] = useState(initialValues)
  const [errors, setErrors] = useState<BlogFormErrors>({})
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setFormValues(initialValues)
    setErrors({})
  }, [initialValues, open])

  function updateField<K extends keyof BlogFormValues>(key: K, value: BlogFormValues[K]) {
    setFormValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors[key]
      delete nextErrors.form
      return nextErrors
    })
  }

  async function handleImageSelection(file: File) {
    setIsUploading(true)

    try {
      const uploaded = await uploadPropertyAsset(file, "blogs/cover")
      updateField("coverImageUrl", uploaded.url)
      updateField("coverImageObjectName", uploaded.objectName)
    } catch (error) {
      setErrors((current) => ({
        ...current,
        coverImageUrl: error instanceof Error ? error.message : "Failed to upload cover image.",
      }))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="flex w-[min(100%-1.5rem,80rem)] max-h-[calc(100dvh-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-200 px-8 py-6">
          <DialogTitle className="text-2xl font-black text-slate-900">
            {mode === "create" ? "Create Blog Post" : "Edit Blog Post"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            {"Manage the public blog content here, including cover image, publishing state, highlights, and article body."}
          </DialogDescription>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={async (event) => {
            event.preventDefault()
            const nextErrors = validateBlogForm(formValues)

            if (Object.keys(nextErrors).length > 0) {
              setErrors(nextErrors)
              return
            }

            await onSubmit(formValues)
          }}
        >
          <div className="grid min-h-0 flex-1 gap-8 overflow-y-auto px-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  {"Title"}
                </label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50"
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="Write the article title"
                  value={formValues.title}
                />
                <FieldError error={errors.title} />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">
                    {"Category"}
                  </label>
                  <Input
                    className="rounded-xl border-slate-200 bg-slate-50"
                    onChange={(event) => updateField("category", event.target.value)}
                    placeholder="Market Trends"
                    value={formValues.category}
                  />
                  <FieldError error={errors.category} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">
                    {"Author"}
                  </label>
                  <Input
                    className="rounded-xl border-slate-200 bg-slate-50"
                    onChange={(event) => updateField("authorName", event.target.value)}
                    placeholder="Editorial author"
                    value={formValues.authorName}
                  />
                  <FieldError error={errors.authorName} />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">
                    {"Read Time"}
                  </label>
                  <Input
                    className="rounded-xl border-slate-200 bg-slate-50"
                    min="1"
                    onChange={(event) => updateField("readTimeMinutes", event.target.value)}
                    placeholder="5"
                    type="number"
                    value={formValues.readTimeMinutes}
                  />
                  <FieldError error={errors.readTimeMinutes} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">
                    {"Publish At"}
                  </label>
                  <Input
                    className="rounded-xl border-slate-200 bg-slate-50"
                    onChange={(event) => updateField("publishedAt", event.target.value)}
                    type="datetime-local"
                    value={formValues.publishedAt}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  {"Excerpt"}
                </label>
                <Textarea
                  className="min-h-28 rounded-xl border-slate-200 bg-slate-50 p-4"
                  onChange={(event) => updateField("excerpt", event.target.value)}
                  placeholder="Short article summary for cards and blog listing."
                  value={formValues.excerpt}
                />
                <FieldError error={errors.excerpt} />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  {"Paragraphs"}
                </label>
                <Textarea
                  className="min-h-56 rounded-xl border-slate-200 bg-slate-50 p-4"
                  onChange={(event) => updateField("paragraphs", event.target.value)}
                  placeholder={"Write the article body here. Separate paragraphs with a blank line."}
                  value={formValues.paragraphs}
                />
                <FieldError error={errors.paragraphs} />
              </div>
            </div>
            <div className="space-y-6">
              <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {"Cover Image"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {"Used for the blog cards, detail hero, and homepage blog section."}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {"Recommended ratio: 16:9 | Keep the subject centered for square and 4:3 crops"}
                    </p>
                  </div>
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    {formValues.coverImageUrl ? "Replace" : "Upload"}
                  </button>
                </div>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""

                    if (file) {
                      void handleImageSelection(file)
                    }
                  }}
                  ref={fileInputRef}
                  type="file"
                />
                <div className="mt-5">
                  {formValues.coverImageUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div
                        className="h-56 w-full bg-cover bg-center"
                        style={{ backgroundImage: `url("${formValues.coverImageUrl}")` }}
                      />
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500">
                          {isUploading ? "Uploading new cover..." : "Ready for publish"}
                        </p>
                        <button
                          className="text-xs font-bold text-rose-600 transition-colors hover:text-rose-700"
                          onClick={() => {
                            updateField("coverImageUrl", "")
                            updateField("coverImageObjectName", "")
                          }}
                          type="button"
                        >
                          {"Remove"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="flex h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <AppIcon className="text-4xl" name="add_photo_alternate" />
                      <span className="mt-3 text-sm font-bold">
                        {"Choose cover image"}
                      </span>
                    </button>
                  )}
                </div>
                <FieldError error={errors.coverImageUrl} />
              </section>

              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    checked={formValues.isPublished}
                    className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                    onChange={(event) => updateField("isPublished", event.target.checked)}
                    type="checkbox"
                  />
                  {"Published on public blog"}
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    checked={formValues.isFeatured}
                    className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                    onChange={(event) => updateField("isFeatured", event.target.checked)}
                    type="checkbox"
                  />
                  {"Feature this article"}
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  {"Tags"}
                </label>
                <Textarea
                  className="min-h-28 rounded-xl border-slate-200 bg-slate-50 p-4"
                  onChange={(event) => updateField("tags", event.target.value)}
                  placeholder={"One tag per line. You can also paste comma-separated values."}
                  value={formValues.tags}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">
                  {"Highlights"}
                </label>
                <Textarea
                  className="min-h-28 rounded-xl border-slate-200 bg-slate-50 p-4"
                  onChange={(event) => updateField("highlights", event.target.value)}
                  placeholder={"One key point per line."}
                  value={formValues.highlights}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-4 border-t border-slate-200 bg-slate-50 px-8 py-6">
            {errors.form ? (
              <p className="mr-auto text-sm font-semibold text-rose-600">
                {errors.form}
              </p>
            ) : null}
            <button
              className="rounded-xl px-6 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              {"Cancel"}
            </button>
            <button
              className="rounded-xl bg-primary px-8 py-3 font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || isUploading}
              type="submit"
            >
              {isSubmitting || isUploading
                ? mode === "create"
                  ? "Saving..."
                  : "Updating..."
                : mode === "create"
                  ? "Create Blog Post"
                  : "Save Blog Post"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BlogManagementPage() {
  const [activeStatus, setActiveStatus] = useState<"all" | "published" | "draft">("all")
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [modalState, setModalState] = useState<BlogModalState>(null)

  const blogsQuery = useAdminBlogPosts({
    isPublished: activeStatus === "all" ? undefined : activeStatus === "published",
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
  })
  const createBlogMutation = useCreateBlogPost()
  const updateBlogMutation = useUpdateBlogPost()
  const deleteBlogMutation = useDeleteBlogPost()

  const items = useMemo(() => blogsQuery.data?.items ?? [], [blogsQuery.data?.items])
  const isLoading = !blogsQuery.data && (blogsQuery.isLoading || blogsQuery.isFetching)
  const initialValues = useMemo(() => {
    if (modalState?.mode === "edit") {
      return fromBlogPost(modalState.post)
    }

    return createEmptyBlogForm()
  }, [modalState])

  async function handleDelete(post: BlogPostItem) {
    const response = await deleteBlogMutation.mutateAsync({ id: `${post.id}` })

    if (!response.error && post.coverImageObjectName) {
      await Promise.allSettled([deleteUploadedAsset(post.coverImageObjectName)])
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">
              {"Admin Workspace"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {"Blog Management"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              {"Create and publish the real blog posts that feed the public blog page, homepage cards, and detail pages."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-[280px]">
              <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" name="search" />
              <Input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setPage(1)
                }}
                placeholder="Search title, category, or author"
                type="text"
                value={searchTerm}
              />
            </label>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
              onClick={() => setModalState({ mode: "create" })}
              type="button"
            >
              <AppIcon className="text-lg" name="add" />
              {"Add Blog Post"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 lg:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              {"Total Posts"}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-900">
              {blogsQuery.data?.totalCount ?? 0}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              {"Published On Page"}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-900">
              {items.filter((item) => item.isPublished).length}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              {"Featured On Page"}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-900">
              {items.filter((item) => item.isFeatured).length}
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap gap-3">
            {[
              { id: "all", label: "All Posts" },
              { id: "published", label: "Published" },
              { id: "draft", label: "Drafts" },
            ].map((filter) => (
              <button
                key={filter.id}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  activeStatus === filter.id
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                }`}
                onClick={() => {
                  setActiveStatus(filter.id as "all" | "published" | "draft")
                  setPage(1)
                }}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {"Blog Posts"}
              </h2>
              <p className="text-sm text-slate-500">
                {`${blogsQuery.data?.totalCount ?? 0} total result${(blogsQuery.data?.totalCount ?? 0) === 1 ? "" : "s"}`}
              </p>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              {`Page ${page} of ${Math.max(blogsQuery.data?.totalPages ?? 1, 1)}`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {"Article"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {"Category"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {"Author"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {"Status"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {"Updated"}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    {"Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                      {"Loading blog posts..."}
                    </td>
                  </tr>
                ) : blogsQuery.error ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm font-semibold text-rose-600" colSpan={6}>
                      {blogsQuery.error.message}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                      {"No blog posts match the current filters."}
                    </td>
                  </tr>
                ) : (
                  items.map((post) => (
                    <tr key={post.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-14 w-20 rounded-xl bg-cover bg-center"
                            style={{ backgroundImage: `url("${post.coverImageUrl}")` }}
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {post.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {post.excerpt}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {post.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {post.authorName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge isPublished={post.isPublished} />
                          {post.isFeatured ? (
                            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                              {"Featured"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatBlogDate(post.updatedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                            onClick={() => setModalState({ mode: "edit", post })}
                            type="button"
                          >
                            <AppIcon name="edit" />
                          </button>
                          <Link
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary"
                            href={`/blog/${post.slug}`}
                            target="_blank"
                          >
                            <AppIcon name="visibility" />
                          </Link>
                          <button
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
                            onClick={() => void handleDelete(post)}
                            type="button"
                          >
                            <AppIcon name="delete" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-6 py-4">
            <PagePagination
              currentPage={page}
              onPageChange={setPage}
              totalPages={blogsQuery.data?.totalPages ?? 1}
            />
          </div>
        </section>
      </main>

      {modalState ? (
        <BlogEditorDialog
          initialValues={initialValues}
          isSubmitting={createBlogMutation.isPending || updateBlogMutation.isPending}
          mode={modalState.mode}
          onClose={() => setModalState(null)}
          onSubmit={async (values) => {
            const payload = toSaveInput(values)

            if (modalState.mode === "edit") {
              const previousCoverObjectName = modalState.post.coverImageObjectName ?? null
              const nextCoverObjectName = payload.coverImageObjectName ?? null
              const response = await updateBlogMutation.mutateAsync({
                ...modalState.post,
                ...payload,
              })

              if (!response.error) {
                if (previousCoverObjectName && previousCoverObjectName !== nextCoverObjectName) {
                  await Promise.allSettled([deleteUploadedAsset(previousCoverObjectName)])
                }
                setModalState(null)
                return
              }

              if (nextCoverObjectName && nextCoverObjectName !== previousCoverObjectName) {
                await Promise.allSettled([deleteUploadedAsset(nextCoverObjectName)])
              }

              return
            }

            const response = await createBlogMutation.mutateAsync(payload)

            if (!response.error) {
              setModalState(null)
              return
            }

            if (payload.coverImageObjectName) {
              await Promise.allSettled([deleteUploadedAsset(payload.coverImageObjectName)])
            }
          }}
          open={Boolean(modalState)}
        />
      ) : null}
    </div>
  )
}
