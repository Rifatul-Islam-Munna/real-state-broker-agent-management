# Tenant Knowledge Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an evidence-first tenant chatbot for web, email, and SMS with Qdrant retrieval, strict stop rules, test mode, knowledge improvement, lead activity, and showing requests.

**Architecture:** A focused NestJS module owns pure policy decisions, PostgreSQL persistence, embeddings, Qdrant access, and channel orchestration. Next.js pages consume guarded tenant and superadmin APIs. Existing outreach and showing infrastructure remains the delivery and approval boundary.

**Tech Stack:** NestJS 11, TypeScript, PostgreSQL/pg, TypeORM, Qdrant REST, Transformers.js with all-MiniLM-L6-v2 ONNX, Next.js 16, React 19, shadcn/ui, Jest.

**Spec:** `docs/superpowers/specs/2026-08-24-tenant-knowledge-chatbot-design.md`

## Global Constraints

- Qdrant is the only vector database; do not add pgvector.
- PostgreSQL is authoritative and Qdrant contains derived vectors plus safe routing metadata.
- Settings default disabled globally and per channel.
- No evidence, insufficient evidence, conflict, or unavailable infrastructure means no factual answer.
- LEAD and REALTOR audience filters apply before search.
- Every bot delivery repeats the stop and human-intervention check.
- Test mode has no lead, conversation, outreach, or showing side effects.
- Use strict red-green-refactor TDD for every production behavior.
- Preserve the recorded baseline: 39 passing and 11 failing backend suites before this feature.

## File map

- `backend-nestjs/src/tenant-database/tenant-database.migrations.ts`: tenant schema version 11.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot.types.ts`: public domain types and ports.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot-policy.ts`: pure stop and authorization decisions.
- `backend-nestjs/src/tenant-chatbot/property-knowledge.mapper.ts`: lead/realtor field allowlists.
- `backend-nestjs/src/tenant-chatbot/mini-lm-embedding.service.ts`: lazy local ONNX embedding adapter.
- `backend-nestjs/src/tenant-chatbot/qdrant-knowledge.service.ts`: collection, indexing, and filtered search.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot.service.ts`: persistence and orchestration.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot.controller.ts`: guarded tenant settings, knowledge, test, logs, and stop APIs.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot-public.controller.ts`: tenant-host web chat API.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot-worker.service.ts`: Email/SMS inbound processing.
- `backend-nestjs/src/tenant-chatbot/platform-chatbot-knowledge.entity.ts`: master knowledge source.
- `backend-nestjs/src/tenant-chatbot/platform-chatbot-knowledge.service.ts`: superadmin CRUD/indexing.
- `backend-nestjs/src/tenant-chatbot/platform-chatbot-knowledge.controller.ts`: superadmin API.
- `backend-nestjs/src/tenant-chatbot/tenant-chatbot.module.ts`: module wiring.
- `frontend/lib/tenant-chatbot-actions.ts`: typed tenant and public calls.
- `frontend/components/stitch/pages/chatbot-settings/page.tsx`: tenant switches, rules, and knowledge.
- `frontend/components/stitch/pages/test-chatbot/page.tsx`: side-effect-free simulator.
- `frontend/app/dashboard/chatbot-settings/page.tsx`: settings route.
- `frontend/app/dashboard/test-chatbot/page.tsx`: simulator route.
- `frontend/app/super-admin/(portal)/chatbot-knowledge/page.tsx`: platform knowledge management.
- Existing app module, guards, outreach, public property dialog, dashboard routes, and sidebars receive focused integration edits.

---

### Task 1: Tenant schema, settings, and policy engine

**Interfaces:**
- Produces `ChatbotSettings`, `PolicyContext`, `PolicyDecision`, and `evaluateChatbotPolicy(context)`.
- Default settings return `enabled: false` and all channel flags false.

- [ ] **Step 1: Write failing migration and policy tests**

Create `tenant-chatbot-policy.spec.ts` with cases for disabled channel, manual stop, human intervention, do-not-contact, unavailable property, below-minimum credit, missing credit clarification, turn limit, and allowed retrieval.

```ts
expect(evaluateChatbotPolicy({
  settings: defaultChatbotSettings(),
  channel: 'WEB',
  conversationStatus: 'ACTIVE',
})).toMatchObject({ action: 'STOP', reason: 'BOT_DISABLED' });
```

Extend `tenant-database.service.spec.ts` with a migration assertion that version 11 creates chatbot knowledge, conversation, message, event, and processed-inbound tables.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx jest tenant-chatbot/tenant-chatbot-policy.spec.ts tenant-database/tenant-database.service.spec.ts --runInBand`  
Expected: FAIL because policy exports and migration version 11 do not exist.

- [ ] **Step 3: Implement schema and pure policy**

Add migration version 11 with foreign keys, source/audience checks, idempotency keys, active-conversation indexes, event indexes, and the `chatbot_settings` tenant setting. Implement immutable defaults, input normalization, score validation from 300 through 850, and deterministic stop precedence.

- [ ] **Step 4: Run tests and verify GREEN**

Run the same Jest command. Expected: chatbot policy tests pass; the unrelated stale migration assertion is updated to compare against the actual latest version.

- [ ] **Step 5: Commit**

```bash
git add backend-nestjs/src/tenant-database backend-nestjs/src/tenant-chatbot
git commit -m "feat: add tenant chatbot policy foundation"
```

### Task 2: Property mapping, embeddings, and Qdrant

**Interfaces:**
- `EmbeddingPort.embed(text: string): Promise<number[]>`
- `VectorKnowledgePort.upsert(points): Promise<void>`
- `VectorKnowledgePort.search(query): Promise<KnowledgeMatch[]>`
- `mapPropertyKnowledge(property): PropertyKnowledgeChunk[]`

- [ ] **Step 1: Write failing isolation and adapter tests**

Test that owner contact, documents, and realtorShowingInstructions never appear in LEAD chunks; realtor chunks include realtorShowingInstructions. Test Qdrant request bodies for fixed scope, tenantId, audience, active, and property filters. Test the embedding adapter rejects vectors not exactly 384 dimensions.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx jest tenant-chatbot/property-knowledge.mapper.spec.ts tenant-chatbot/qdrant-knowledge.service.spec.ts tenant-chatbot/mini-lm-embedding.service.spec.ts --runInBand`  
Expected: FAIL because mapper and adapters do not exist.

- [ ] **Step 3: Install and implement adapters**

Run: `npm install @huggingface/transformers`. Use a dynamic ESM loader, one cached feature-extraction pipeline, mean pooling, normalization, configurable local model path, and production remote-download denial. Implement Qdrant REST collection initialization, 384-vector upsert, delete-by-source, and filtered search without storing source text or PII in payload.

- [ ] **Step 4: Run tests and verify GREEN**

Run the three focused suites. Expected: all pass without loading a real model or contacting Qdrant because tests inject deterministic loaders/fetch functions.

- [ ] **Step 5: Commit**

```bash
git add backend-nestjs/package.json backend-nestjs/package-lock.json backend-nestjs/src/tenant-chatbot
git commit -m "feat: add qdrant property knowledge retrieval"
```

### Task 3: Knowledge persistence and side-effect-free test mode

**Interfaces:**
- `TenantChatbotService.getSettings/updateSettings`
- `listKnowledge/createKnowledge/updateKnowledge/deleteKnowledge/reindex`
- `testQuestion(tenant, input): Promise<TestChatbotResult>`

- [ ] **Step 1: Write failing service and controller tests**

Use a fake tenant client, fake embedding port, and fake vector store. Assert normalized settings, tenant-local CRUD, source hash idempotency, two-query PLATFORM/TENANT merge, conflict rejection, threshold rejection, evidence identifiers, and zero INSERTs into lead/conversation/outreach/showing tables during test mode.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx jest tenant-chatbot/tenant-chatbot.service.spec.ts tenant-chatbot/tenant-chatbot.controller.spec.ts --runInBand`  
Expected: FAIL because service, module, and controller do not exist.

- [ ] **Step 3: Implement the service, controllers, and module**

Add guarded `/tenant-chatbot/settings`, `/knowledge`, `/knowledge/:id`, `/reindex`, and `/test` endpoints. Register the module in AppModule. Update JWT tenant-safe paths and staff permission mapping with tests: settings/knowledge require settings permission; test/activity/lead controls require lead permission.

- [ ] **Step 4: Run tests and verify GREEN**

Run focused chatbot and guard suites. Expected: all new suites pass.

- [ ] **Step 5: Commit**

```bash
git add backend-nestjs/src/app.module.ts backend-nestjs/src/auth backend-nestjs/src/tenant-dashboard backend-nestjs/src/tenant-chatbot
git commit -m "feat: add tenant chatbot knowledge and test APIs"
```

### Task 4: Conversations, stop controls, and channel processing

**Interfaces:**
- `handleMessage(tenant, input): Promise<ChatbotResponse>`
- `authorizeOutboundJob(tenant, job): Promise<OutboundAuthorization>`
- `stopLead/resumeLead/listLeadActivity`

- [ ] **Step 1: Write failing orchestration tests**

Cover web idempotency, Email/SMS inbound rows, channel-disabled behavior, manual stop cancellation, human outgoing detection, a human message arriving after bot enqueue but before delivery, do-not-contact, credit below property minimum, missing credit clarification, and system-unavailable fail-closed behavior.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx jest tenant-chatbot/tenant-chatbot-orchestration.spec.ts tenant-dashboard/tenant-outreach.service.spec.ts --runInBand`  
Expected: FAIL because conversations, worker, and outbound authorization are absent.

- [ ] **Step 3: Implement orchestration and delivery gate**

Persist conversations/messages/events transactionally. Scan unprocessed Incoming Email/SMS outreach rows with unique idempotency keys. Enqueue replies with `source_type = 'tenant-chatbot'` and conversation metadata. Before `TenantOutreachService.processClaimedJob` delivers a chatbot job, invoke the authorization gate and cancel on any terminal or human-intervention decision.

Add guarded activity, stop, and resume endpoints. Stop cancels only scheduled/retrying chatbot-owned jobs for that conversation.

- [ ] **Step 4: Add showing-request tests and implementation**

Test that unconfirmed or incomplete date/time input does not create a request. Test explicit confirmation inserts one submitted `tenant_showing_request`, logs SHOWING_REQUESTED, and stops that conversation.

- [ ] **Step 5: Run tests and verify GREEN**

Run focused orchestration, outreach, and showing suites. Expected: all new tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend-nestjs/src/tenant-chatbot backend-nestjs/src/tenant-dashboard
git commit -m "feat: automate chatbot channels with strict takeover"
```

### Task 5: Superadmin platform knowledge

**Interfaces:**
- Platform CRUD returns active state, audience, priority, source hash, and index status.
- Superadmin endpoints live under `/super-admin-management/chatbot-knowledge`.

- [ ] **Step 1: Write failing entity/service/controller tests**

Assert only Admin role can write, writes create audit records, disabled knowledge is removed from Qdrant, and platform indexing uses scope PLATFORM without tenantId.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx jest tenant-chatbot/platform-chatbot-knowledge.service.spec.ts --runInBand`  
Expected: FAIL because platform knowledge components do not exist.

- [ ] **Step 3: Implement and verify GREEN**

Add the TypeORM entity, service, controller, repository wiring, Qdrant indexing, and audit writes. Run the focused suite and `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add backend-nestjs/src/tenant-chatbot
git commit -m "feat: manage platform chatbot knowledge"
```

### Task 6: Tenant settings, simulator, knowledge, and lead controls UI

**Interfaces:**
- Typed server actions mirror the tenant APIs.
- Pages use existing dashboard authorization and shadcn components.

- [ ] **Step 1: Add failing route/type checks**

Add route-access assertions for chatbot settings and test pages. Run `npm run typecheck`; expected failure is missing pages/actions/types.

- [ ] **Step 2: Build settings and test pages**

Use Card, Alert, Badge, Switch, Input, Textarea, Select, Table, Skeleton, Empty, Field, and FieldGroup. Settings exposes all switches/rules and knowledge CRUD. Test page shows decision, score, evidence, stop reason, and Improve Knowledge without external side effects. Add routes and sidebar grouping.

- [ ] **Step 3: Add lead activity stop control**

Extend lead activity presentation with chatbot events and an explicit Stop Chatbot action. Resume is shown only for MANUAL_STOP.

- [ ] **Step 4: Verify frontend**

Run: `npm run typecheck`, `npm run lint`, and `npm run build`. Expected: zero new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat: add chatbot settings and simulator"
```

### Task 7: Public web chat and superadmin UI

- [ ] **Step 1: Write failing public API tests**

Assert tenant host is required, property must be published, input sizes are bounded, disabled web channel returns no reply, session id is idempotent, and internal realtor evidence cannot be requested publicly.

- [ ] **Step 2: Implement public chat integration**

Add the public endpoint and connect the existing property-chat dialog after contact capture. Preserve the existing inquiry flow, show delayed/pending state, render bot/lead bubbles accessibly, and stop polling after a terminal decision.

- [ ] **Step 3: Implement superadmin knowledge page**

Add the portal navigation item and CRUD/reindex page using existing superadmin actions and shadcn patterns.

- [ ] **Step 4: Verify**

Run focused backend public tests plus frontend typecheck, lint, and build.

- [ ] **Step 5: Commit**

```bash
git add backend-nestjs/src/tenant-chatbot frontend
git commit -m "feat: connect public and platform chatbot interfaces"
```

### Task 8: Final regression verification

- [ ] **Step 1: Run all chatbot suites**

Run: `npx jest tenant-chatbot --runInBand`. Expected: all pass with no warnings.

- [ ] **Step 2: Run related tenant suites**

Run tenant database, tenant dashboard, outreach, guard, and public controller suites. Compare failures to the recorded baseline; no new failure is accepted.

- [ ] **Step 3: Run builds and static checks**

Run backend `npm run build`; frontend `npm run typecheck`, `npm run lint`, and `npm run build`.

- [ ] **Step 4: Review repository state**

Run `git diff --check`, `git status --short`, and inspect all chatbot diffs for secrets, PII in Qdrant payloads, audience leakage, missing guards, and accidental unrelated edits.

- [ ] **Step 5: Commit verification fixes**

Commit only fixes required by verification with message `fix: complete chatbot verification`.