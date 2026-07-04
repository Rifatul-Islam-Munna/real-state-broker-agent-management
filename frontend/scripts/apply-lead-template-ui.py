from pathlib import Path

# Extend inbox API types with parser audit metadata.
types_path = Path('frontend/@types/real-estate-api.ts')
types_text = types_path.read_text()
old_type = '''export type MailInboxItem = {
  id: number
  email: string
  name: string
  subject: string
  message: string
  kind: MailInboxKind
  status: MailInboxStatus
  leadId?: number | null
  createdAt: string
  updatedAt: string
}'''
new_type = '''export type MailInboxItem = {
  id: number
  email: string
  name: string
  subject: string
  message: string
  htmlBody?: string
  kind: MailInboxKind
  status: MailInboxStatus
  leadId?: number | null
  extractedLead?: Record<string, unknown>
  extractionMethod?: string
  extractionConfidence?: number
  leadCollectionTemplateId?: number | null
  leadCollectionTemplateName?: string
  aiFallbackUsed?: boolean
  extractionDetails?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}'''
if old_type not in types_text:
    raise SystemExit('MailInboxItem type block not found')
types_path.write_text(types_text.replace(old_type, new_type, 1))

# Allow uploaded plain-text files as well as HTML files in the editor.
editor_path = Path('frontend/components/stitch/pages/lead-collection-templates/editor.tsx')
editor_text = editor_path.read_text()
old_payload = '''      sourceHtml:
        value.sourceType === "PastedHtml" || value.sourceType === "UploadedHtml" ? pastedHtml : "",
      sourceText: value.sourceType === "PastedText" ? pastedText : "",'''
new_payload = '''      sourceHtml:
        value.sourceType === "PastedHtml" || value.sourceType === "UploadedHtml" ? pastedHtml : "",
      sourceText:
        value.sourceType === "PastedText" || (value.sourceType === "UploadedHtml" && !pastedHtml)
          ? pastedText
          : "",'''
if old_payload not in editor_text:
    raise SystemExit('Editor source payload block not found')
editor_path.write_text(editor_text.replace(old_payload, new_payload, 1))

# Add lead-template controls and extraction audit badges to Mail Inbox.
inbox_path = Path('frontend/components/stitch/pages/lead-history/managed-mail-inbox-page.tsx')
inbox_text = inbox_path.read_text()
old_header_button = '''            <button
              className="border border-primary bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setIsComposeOpen(true)}
              type="button"
            >
              {"Send Mail"}
            </button>'''
new_header_button = old_header_button + '''
            <Link
              className="border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-white"
              href="/dashboard/lead-collection-templates"
            >
              {"Lead Collect Templates"}
            </Link>'''
if old_header_button not in inbox_text:
    raise SystemExit('Inbox header button block not found')
inbox_text = inbox_text.replace(old_header_button, new_header_button, 1)

old_badges = '''                      <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{item.kind}</span>
                      <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300">{item.status}</span>'''
new_badges = old_badges + '''
                      {item.extractionMethod ? (
                        <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {`${item.extractionMethod} ${Math.round((item.extractionConfidence ?? 0) * 100)}%`}
                        </span>
                      ) : null}
                      {item.leadCollectionTemplateName ? (
                        <span className="border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                          {item.leadCollectionTemplateName}
                        </span>
                      ) : null}
                      {item.aiFallbackUsed ? (
                        <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          {"AI fallback"}
                        </span>
                      ) : item.extractionMethod === "Template" ? (
                        <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {"AI skipped"}
                        </span>
                      ) : null}'''
if old_badges not in inbox_text:
    raise SystemExit('Inbox badge block not found')
inbox_text = inbox_text.replace(old_badges, new_badges, 1)

old_action_start = '''                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {item.leadId ? ('''
new_action_start = '''                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link
                      className="border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-white/10 dark:text-white"
                      href={`/dashboard/lead-collection-templates/new?mailInboxId=${item.id}`}
                    >
                      {"Create Parser"}
                    </Link>
                    {item.leadId ? ('''
if old_action_start not in inbox_text:
    raise SystemExit('Inbox action block not found')
inbox_path.write_text(inbox_text.replace(old_action_start, new_action_start, 1))
