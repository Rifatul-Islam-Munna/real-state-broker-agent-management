# Chatbot Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver reliable chatbot operations controls, 7-day bot audit visibility, Gmail disconnect correctness, and polished chatbot admin UX.

**Architecture:** Reuse existing tenant-chatbot conversation/message/event tables and stop/resume service methods. Add read/cleanup APIs around those tables, wire lead-level controls into the existing Lead Activity page, and redesign Test Chatbot/knowledge targeting with existing tenant property data. Gmail scheduler must gate on persisted OAuth connection state before any token refresh.

**Tech Stack:** NestJS, PostgreSQL tenant databases, Next.js 16, React 19, TypeScript, shadcn/Base UI, Jest, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-26-chatbot-operations-design.md`

## Global Constraints
- Test Chatbot has no audience/channel selectors.
- Realtor-private knowledge requires verified tenant Realtor directory identity.
- Bot activity retention is exactly 7 days.
- Gmail disconnect must stop scheduled refresh attempts.
- Preserve existing tenant isolation and chatbot fail-closed behavior.

---

### Task 1: Gmail disconnect and scheduler gating
**Files:** Modify `backend-nestjs/src/mail/mail-sync.service.ts`, Gmail disconnect/settings service/controller files; add/update Jest specs.
**Produces:** A persisted disconnected state that makes scheduled sync return before token refresh.
- [ ] Write a failing test proving scheduled sync skips when Gmail is disconnected even if stale tokens remain.
- [ ] Run the focused test and confirm it fails for a refresh attempt.
- [ ] Update disconnect to clear/disable Gmail OAuth fields and update scheduler preconditions.
- [ ] Run focused mail tests and confirm pass.

### Task 2: Per-lead bot stop/resume in Lead Activity
**Files:** Modify tenant-chatbot client actions and `frontend/components/stitch/pages/lead-history/lead-outreach-schedule-page.tsx`; backend only if status endpoint payload needs extension.
**Produces:** Visible chatbot status with Stop bot / Resume bot actions using existing tenant-chatbot routes.
- [ ] Write backend regression tests for manual stop cancelling chatbot-owned jobs and resume reopening only manual stops.
- [ ] Run tests RED if behavior/status data is incomplete.
- [ ] Add lead chatbot status retrieval/actions and UI controls beside scheduling controls.
- [ ] Run chatbot + relevant frontend checks.

### Task 3: Seven-day Bot Activity page and retention
**Files:** Modify `tenant-chatbot.service.ts/controller.ts/types.ts`; add cleanup scheduler/service; create frontend `/dashboard/bot-activity` page/actions/component; modify dashboard routes/sidebar.
**Produces:** Tenant-safe paginated/read-only bot activity feed and daily purge of rows older than 7 days.
- [ ] Write failing tests for activity query 7-day cutoff and cleanup deletion cutoff.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement listRecentActivity and purgeExpiredActivity using tenant DB tables with lead/property joins.
- [ ] Add tenant-safe controller endpoints and daily cleanup across active tenants.
- [ ] Build professional activity table/cards with filters and lead links; add AI Chatbot sidebar route.
- [ ] Run backend tests and frontend type/build checks.

### Task 4: Professional Test Chatbot
**Files:** Modify `tenant-chatbot.service.ts` test-mode audience default if still pending; redesign `frontend/components/stitch/pages/test-chatbot/page.tsx` and route loader/actions.
**Produces:** Normal chat transcript, searchable optional property selector, composer, and expandable evidence details.
- [ ] Run existing RED tests for tenant-safe `/tenant-chatbot/*` and identity-free test audience.
- [ ] Implement lead-safe test default and verify tests GREEN.
- [ ] Load real tenant properties and replace simulator form with chat bubbles/composer/property picker.
- [ ] Keep evidence/confidence/reason under expandable details per bot reply.
- [ ] Run frontend typecheck/build.

### Task 5: Improve Knowledge responsive polish
**Files:** Modify `frontend/components/stitch/pages/chatbot-settings/page.tsx` and `frontend/lib/chatbot-knowledge-targeting.ts` tests.
**Produces:** Non-cramped responsive targeting layout with real searchable properties and clear audience/priority semantics.
- [ ] Extend helper tests for address fallback/search label and priority preset behavior if needed.
- [ ] Refine targeting into a two-column desktop / stacked mobile panel; preserve exact submit payload.
- [ ] Run helper tests and frontend checks.

### Task 6: Full verification and cleanup
**Files:** No new production files unless failures require fixes.
- [ ] Run affected backend Jest suites including mail, tenant-chatbot, tenant dashboard/outreach.
- [ ] Run backend production build.
- [ ] Run frontend helper tests and full typecheck; distinguish pre-existing unrelated errors from new ones.
- [ ] Run frontend production build and confirm all routes generate.
- [ ] Run `git diff --check`, inspect `git status --short`, remove temporary files, and commit only verified substantive changes.
