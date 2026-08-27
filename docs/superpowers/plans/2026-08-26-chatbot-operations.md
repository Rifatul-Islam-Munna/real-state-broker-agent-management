# Chatbot Operations Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete activity, retention, chat simulator, knowledge layout, and template-driven showing flow.

**Architecture:** Extend existing tenant-chatbot service/controller/worker contracts. Keep server data loading in App Router pages and interaction in focused client components. Persist only template ID in chatbot settings; resolve and render the current active tenant template at showing creation time.

**Tech Stack:** NestJS 11, Jest, PostgreSQL, Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/Base UI.

**Spec:** `docs/superpowers/specs/2026-08-26-chatbot-operations-design.md`

## Global Constraints

- No new dependencies.
- Explicit confirmation, property, valid showing date/time, and contact remain mandatory.
- No Next/Nest build or lint commands.

---

### Task 1: Activity API and scheduled cleanup

**Files:**
- Test: `backend-nestjs/src/tenant-chatbot/tenant-chatbot.controller.spec.ts`
- Test: `backend-nestjs/src/tenant-chatbot/tenant-chatbot-worker.service.spec.ts`
- Modify: `backend-nestjs/src/tenant-chatbot/tenant-chatbot.controller.ts`
- Modify: `backend-nestjs/src/tenant-chatbot/tenant-chatbot-worker.service.ts`

**Interfaces:** Produces `GET /tenant-chatbot/activity`; worker invokes `cleanupExpiredActivity(tenant)` once per eligible tenant.

- [ ] Add controller delegation and worker cleanup tests.
- [ ] Run focused Jest specs; confirm expected failures.
- [ ] Add controller route and cleanup call with per-tenant error isolation.
- [ ] Re-run focused specs; confirm pass.

### Task 2: Showing template settings and confirmed flow

**Files:**
- Test: `backend-nestjs/src/tenant-chatbot/tenant-chatbot-policy.spec.ts`
- Test: `backend-nestjs/src/tenant-chatbot/tenant-chatbot.service.spec.ts`
- Modify: `backend-nestjs/src/tenant-chatbot/tenant-chatbot.types.ts`
- Modify: `backend-nestjs/src/tenant-chatbot/tenant-chatbot-policy.ts`
- Modify: `backend-nestjs/src/tenant-chatbot/tenant-chatbot.service.ts`

**Interfaces:** Produces `ChatbotSettings.showingRequestTemplateId: string | null`; renders active `LeadShowing` template into confirmed request.

- [ ] Add normalization, validation, selected-template rendering, and fallback tests.
- [ ] Run focused Jest specs; confirm expected failures.
- [ ] Implement settings normalization, requirements gate, template lookup, and token rendering.
- [ ] Re-run focused specs; confirm pass.

### Task 3: Bot Activity frontend

**Files:**
- Modify: `frontend/lib/tenant-chatbot-actions.ts`
- Modify: `frontend/components/app-sidebar.tsx`
- Create: `frontend/app/dashboard/bot-activity/page.tsx`
- Create: `frontend/components/stitch/pages/bot-activity/page.tsx`
- Test: `frontend/lib/chatbot-ui-contract.test.mjs`

**Interfaces:** Consumes aggregate activity API; produces searchable/filterable activity timeline.

- [ ] Add source-contract test for route, sidebar, data action, filters, and details.
- [ ] Run Node test; confirm expected failure.
- [ ] Implement typed action, route, navigation, and client timeline.
- [ ] Re-run Node test; confirm pass.

### Task 4: Professional test chat and knowledge/settings polish

**Files:**
- Modify: `frontend/app/dashboard/test-chatbot/page.tsx`
- Modify: `frontend/components/stitch/pages/test-chatbot/page.tsx`
- Modify: `frontend/app/dashboard/chatbot-settings/page.tsx`
- Modify: `frontend/components/stitch/pages/chatbot-settings/page.tsx`
- Modify: `frontend/lib/tenant-chatbot-actions.ts`
- Test: `frontend/lib/chatbot-ui-contract.test.mjs`

**Interfaces:** Test action always sends `LEAD`/`WEB`; settings saves selected `LeadShowing` template ID.

- [ ] Extend source-contract test for chat bubbles, searchable property picker, composer, evidence, no audience/channel/raw ID, template selector, and knowledge edit picker.
- [ ] Run Node test; confirm expected failure.
- [ ] Implement chat workspace, template selector, and responsive knowledge layout/edit controls.
- [ ] Re-run Node test; confirm pass.

### Task 5: Verification

**Files:** All changed files.

- [ ] Run all tenant-chatbot backend Jest specs.
- [ ] Run all frontend `*.test.mjs` tests.
- [ ] Inspect diff and status; fix regressions without touching unrelated files.

### Task 6: Role, qualification, Realtor verification, and reactive messaging

**Files:** tenant chatbot policy/types/service/worker, tenant DB migration, focused Jest specs.

- [ ] Add failing tests for role prompt, credit + monthly-income collection/persistence, Realtor sensitive-data filtering, alternative-property suggestions, and inbound-only Email/SMS behavior.
- [ ] Add conversation audience-confirmation persistence and shared parsing/qualification helpers.
- [ ] Extend live orchestration to update only `creditScore` and `monthlyEarning`, enforce Realtor verification for sensitive evidence, and return showing eligibility after qualification.
- [ ] Re-run focused backend chatbot tests.

### Task 7: Similar-phrasing training and full test-chat simulation

**Files:** property intent matcher, tenant/super-admin knowledge UI/actions, test-chat API/UI, public property chat, frontend tests.

- [ ] Add failing semantic/UI contract tests for move-in, vape, main-question + similar-phrasing fields, qualification chat prompts, and showing form.
- [ ] Implement the shared test-conversation simulation and public showing-confirmation payload.
- [ ] Update tenant and super-admin knowledge editors without changing existing knowledge storage contracts.
- [ ] Run focused frontend Node tests and affected backend chatbot specs.
