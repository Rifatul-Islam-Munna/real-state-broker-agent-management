# Repository Code Map

## AI Chatbot
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot.service.ts` — settings, retrieval, live orchestration, lead stop/resume, activity.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot.controller.ts` — tenant chatbot admin APIs.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot-worker.service.ts` — inbound Email/SMS processing and Realtor verification.
- `backend-nestjs/src/tenant-chatbot/qdrant-knowledge.service.ts` — Qdrant collection/search/upsert/health.
- `backend-nestjs/src/tenant-chatbot/property-question-intent.ts` — canonical real-estate intent detection used for query augmentation and confidence reranking.
- `backend-nestjs/src/tenant-chatbot/lime-bay-chatbot-corpus.ts` — 57-intent Lime Bay semantic regression corpus; 20 variants per intent.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot.semantic-corpus.spec.ts` — 1,140-question chatbot semantic regression.
- `backend-nestjs/src/tenant-database/tenant-database.migrations.ts` — tenant chatbot schema migrations.
- `frontend/components/stitch/pages/test-chatbot/page.tsx` — tenant Test Chatbot UI.
- `frontend/components/stitch/pages/chatbot-settings/page.tsx` — chatbot settings + knowledge UI.
- `frontend/lib/tenant-chatbot-actions.ts` — frontend chatbot API actions/types.
- `frontend/components/stitch/pages/lead-crm-pipeline/sections/lead-detail-components.tsx` — per-lead chatbot activity + stop/resume.

## Messaging / Gmail
- `backend-nestjs/src/mail/mail-sync.service.ts` — scheduled inbox sync/Gmail OAuth refresh.
- `backend-nestjs/src/tenant-dashboard/tenant-outreach.service.ts` — outbound queue delivery.

## Tenant Navigation
- `frontend/components/stitch/shared/dashboard-sidebar.tsx` — sidebar grouping/visibility.
- `frontend/lib/dashboard-routes.ts` — registered dashboard routes/permissions.

## Owner Reports / Weekly CSV Import
- `backend-nestjs/src/tenant-dashboard/tenant-owner-report.service.ts` — tenant-scoped managed/legacy property lookup, 1–5 owner recipient validation, one history report with per-owner Email/SMS delivery jobs and live delivery results.
- `backend-nestjs/src/tenant-database/tenant-database.migrations.ts` (migration 15) — adds managed property reference and recipient snapshots to report history without replacing old reports.
- `backend-nestjs/src/properties/entities/property.entity.ts` / `properties.service.ts` — private owners list and tenant association, retaining legacy primary owner fields.
- `frontend/components/owner-report-recipients-editor.tsx` and `frontend/lib/owner-report-contacts.ts` — reusable multi-owner editor and recipient/channel validation for single and CSV report sending.
- `frontend/components/stitch/pages/property-management/sections/property-form-fields.tsx` — repeatable owner inputs in property create/edit.
- `frontend/components/owner-report-create-workspace.tsx` — CSV-first, keyboard-accessible Create Owner Report tabs.
- `frontend/components/owner-report-csv-review-row.tsx` — compact responsive property review cards, owner corrections, activity summary, and message previews.
- `frontend/lib/owner-report-csv-workflow.ts` — per-property CSV matching, recipient validation, and selected-week template values shared by the guided importer.
- `frontend/lib/owner-report-csv.ts` — parses flat, grouped, and row-per-week CSV layouts, selects the requested week, and matches property addresses.
- `frontend/components/tenant-owner-report-bulk-import.tsx` — browser-side CSV import, template variable mapping, owner contact corrections, preview, and per-property queueing through the existing owner report action.
- `frontend/components/stitch/pages/agency-settings/sections/communication-template-workspace-v2.tsx` — available Owner Feedback variables, including weekly CSV variables.
- `frontend/public/owner-report-standard.csv` and `frontend/public/owner-report-grouped.csv` — downloadable report templates.
- `frontend/owner-report-csv.test.mjs` — parser and template regression tests.

Keep this map updated when subsystem ownership changes.
