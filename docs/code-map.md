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

Keep this map updated when subsystem ownership changes.
