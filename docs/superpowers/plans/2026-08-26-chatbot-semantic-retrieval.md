# Chatbot Semantic Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the property chatbot to Arctic-xs semantic retrieval, topic-aware evidence grouping/conflict detection, human verified-fact answers, and qualification-gated showing intent.

**Architecture:** Qdrant stays the candidate generator while Snowflake Arctic-xs supplies stronger 384-d embeddings. A deterministic topic/fact layer reranks candidates, groups complementary evidence, scopes conflict detection to the same fact, and composes human responses from verified facts. Showing intent is handled by the workflow before generic knowledge fallback.

**Tech Stack:** NestJS, TypeScript, `@huggingface/transformers`, ONNX Runtime, Qdrant, Jest, Next.js/React frontend tests.

**Spec:** `docs/superpowers/specs/2026-08-26-chatbot-semantic-retrieval-design.md`

## Global Constraints
- Follow `AI Coding Rules.md`.
- Preserve all existing uncommitted user work; do not reset or rewrite unrelated files.
- Default model: `Snowflake/snowflake-arctic-embed-xs`; keep `CHATBOT_EMBEDDING_MODEL` override for Arctic-s.
- CPU inference only; default embedding concurrency is 1.
- Keep vectors 384-dimensional for Arctic-xs/s.
- Do not expose sensitive Realtor evidence before directory verification.
- Email/SMS chatbot processing remains inbound-only.
- Qualification collects only `creditScore` and `monthlyEarning`.

---

### Task 1: Arctic embedding adapter and CPU throttle
**Files:** Modify `backend-nestjs/src/tenant-chatbot/mini-lm-embedding.service.ts`; test `mini-lm-embedding.service.spec.ts`.
**Interfaces:** `embed(text: string, kind?: 'query'|'document'): Promise<number[]>`; `modelSignature(): string`.
- [ ] Write failing tests proving Arctic-xs is the default, query prefix is applied only to queries, CLS pooling is used, output is 384-d, and two concurrent calls are serialized.
- [ ] Run the focused embedding spec and confirm failure.
- [ ] Implement the minimal adapter/queue while retaining environment overrides and one-time warmup.
- [ ] Run the focused embedding spec and confirm pass.

### Task 2: Canonical fact identity and topic-aware conflict detection
**Files:** Modify `property-knowledge.mapper.ts`, `tenant-chatbot.service.ts`; tests `property-knowledge.mapper.spec.ts`, `tenant-chatbot.service.spec.ts`.
**Interfaces:** `canonicalFactKey(record)`, topic family helpers, `hasEvidenceConflict(question, hydrated)`.
- [ ] Add failing tests showing landlord monthly income + HOA annual income + DTI are complementary, while two pet-policy facts with opposite values conflict.
- [ ] Run focused specs and confirm failure.
- [ ] Add stable fact identities and scope conflict comparison to the same canonical fact.
- [ ] Run focused specs and confirm pass.

### Task 3: Semantic reranking and evidence grouping
**Files:** Modify `property-question-intent.ts`, `tenant-chatbot.service.ts`; tests `tenant-chatbot.semantic-corpus.spec.ts` plus focused service tests.
**Interfaces:** `rankEvidence(question, hydrated)`, `selectAnswerEvidence(question, ranked)`.
- [ ] Add failing corpus cases for income paraphrases from the screenshots and noisy grammar/typos.
- [ ] Run the corpus test and confirm failures.
- [ ] Implement hybrid semantic/topic/lexical scoring and select a coherent topic cluster with compatible supporting facts.
- [ ] Run corpus/service tests and confirm pass.

### Task 4: Verified-fact human answer composer
**Files:** Create or extract focused helper under `backend-nestjs/src/tenant-chatbot/`; modify `tenant-chatbot.service.ts`; tests beside helper/service.
**Interfaces:** `composeVerifiedAnswer(question, evidence): string`.
- [ ] Add failing tests for an income answer that combines 3x rent, $4,650/month, $40,000/year HOA, 40% DTI, and proof documents without calling them conflicts.
- [ ] Run focused test and confirm failure.
- [ ] Implement deterministic NLG templates over verified evidence only.
- [ ] Run focused tests and confirm pass.

### Task 5: Showing/rental workflow intent
**Files:** Modify `chatbot-conversation-intent.ts`, `tenant-chatbot.service.ts`, public/test chat UI helpers and tests.
**Interfaces:** `parseShowingIntent(text): boolean`; workflow returns qualification prompt or `showingEligible: true` rather than generic evidence fallback.
- [ ] Add failing backend/frontend tests for `I wanna rent this`, `give me showing form`, `how to request showing`, and `can I see the property`.
- [ ] Verify tests fail with evidence-insufficient/conflict today.
- [ ] Implement workflow routing: answer intent, collect missing role/credit/income, and unlock existing showing form only after passing both checks.
- [ ] Run focused backend/frontend tests and confirm pass.

### Task 6: Model signature and safe reindex
**Files:** Modify Qdrant metadata/service and tenant/platform reindex paths; migration/settings tests as needed.
**Interfaces:** vectors/indexed records expose embedding model signature; retrieval ignores stale signature candidates.
- [ ] Add failing tests for mixed-model/stale-index rejection.
- [ ] Implement signature propagation and safe reindex behavior without changing 384-d collection shape.
- [ ] Run reindex/migration/platform knowledge tests.

### Task 7: Final regression and low-VPS verification
**Files:** No unrelated changes.
- [ ] Run all focused chatbot Jest suites including semantic corpus and worker/channel tests.
- [ ] Run frontend chatbot Node tests.
- [ ] Run `npm run build` in backend.
- [ ] Run focused frontend ESLint and TypeScript check; distinguish unrelated pre-existing errors.
- [ ] Run `git diff --check`, inspect `git status`, remove temp/debug files, and verify no unrelated user changes were overwritten.
