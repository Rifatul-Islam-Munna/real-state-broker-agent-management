# Tenant Knowledge Chatbot Design

**Date:** 2026-08-24  
**Status:** Approved  
**Scope:** Tenant web chat, inbound email, and SMS

## Goal

Build an evidence-first, multi-tenant real-estate chatbot that answers from controlled property, tenant, and platform knowledge; stops safely; records every decision; and can create a showing request only after explicit confirmation.

## Non-negotiable behavior

- Qdrant is the vector database. PostgreSQL is the authoritative store.
- The embedding model is all-MiniLM-L6-v2 through Transformers.js/ONNX.
- The master switch defaults off. Web, email, and SMS have separate switches.
- A bot answer requires eligible evidence at or above the configured threshold.
- Missing, ambiguous, stale, or conflicting evidence produces no factual answer.
- Every outbound bot job is re-authorized immediately before delivery.
- Human intervention, manual stop, do-not-contact, and below-minimum credit stop the bot.
- The bot never resumes automatically after a terminal stop.
- A showing request requires explicit property, date/time, contact, and confirmation.
- Test mode never creates leads, sends messages, or changes conversation state.

## Architecture

The feature lives in a focused NestJS tenant-chatbot module. Pure policy and answer-selection functions have no database or network dependencies. Orchestration depends on small embedding and vector-store interfaces so tests can use deterministic fakes.

Tenant PostgreSQL stores settings, knowledge source text, conversations, messages, events, indexing status, and processed inbound identifiers. Qdrant stores derived vectors and non-sensitive routing payload. Global knowledge is stored in the master PostgreSQL database.

The worker processes unhandled inbound Email and SMS outreach rows. Public web chat calls the same orchestrator synchronously. All three channels therefore share one policy engine, retrieval path, stop behavior, and event format.

## Knowledge and audience boundaries

Knowledge scopes are PLATFORM, TENANT, and PROPERTY. Audiences are LEAD and REALTOR.

Lead retrieval can use platform lead knowledge, tenant lead knowledge, and public property fields. Realtor retrieval can additionally use realtor description, showing instructions, owner/internal remarks, and other explicitly realtor-only fields. Internal values are never copied into LEAD points.

Qdrant searches use fixed scope and audience filters before vector search. Tenant and platform knowledge are queried separately, then merged and ranked. A tenant identifier is mandatory for every tenant query. Property questions also require a property filter when a property is selected.

All property payload values are normalized through explicit field maps. Unknown fields are not silently exposed. Public listing facts, qualification requirements, availability, application instructions, and amenities are lead-safe. Owner contacts, entry notes, documents, commission data, and realtor instructions are realtor-only.

## Qdrant and embeddings

The adapter uses the Qdrant REST API and one configured collection. Point payload contains scope, tenantId when applicable, audience, propertyId, knowledgeId, sourceType, sourceHash, priority, and active status. It contains no lead PII and no owner contact details.

all-MiniLM-L6-v2 produces normalized 384-dimensional embeddings. The model is loaded once per backend process from a configurable local model path. Runtime remote-model downloads are disabled in production. Qdrant URL, API key, collection, model path, and thresholds are environment-configurable.

Indexing is idempotent by source hash. Property save/update can request reindexing; the settings and knowledge pages also expose explicit reindex actions. Qdrant failure marks the source failed and leaves the bot fail-closed.

## Deterministic decision flow

1. Resolve tenant, channel, audience, lead, and property.
2. Lock or create the conversation and enforce idempotency.
3. Evaluate enabled switches and terminal stop state.
4. Detect any human outgoing message since bot activation.
5. Evaluate do-not-contact, property availability, turn limit, and credit rules.
6. Embed the question and retrieve pre-filtered Qdrant evidence.
7. Reject evidence below threshold, conflicting facts, or disallowed audience.
8. Return a controlled answer based only on stored evidence.
9. Persist message, evidence identifiers, score, decision, and events.
10. For Email/SMS, enqueue a bot-owned outreach job.
11. Immediately before delivery, repeat the terminal and human-intervention checks.

## Accuracy contract

The feature does not promise that every question receives an answer. It promises that factual answers are evidence-backed. The answer composer may join compatible facts and apply approved templates, but cannot introduce an unsupported property fact.

Confidence combines vector score, exact property match, source priority, freshness, and conflict checks. Raw vector similarity alone never authorizes an answer. Test mode exposes the score breakdown and matched sources so tenants can improve weak knowledge.

## Stop rules

Terminal reasons are MANUAL_STOP, HUMAN_INTERVENED, CREDIT_BELOW_MINIMUM, DO_NOT_CONTACT, PROPERTY_UNAVAILABLE, EVIDENCE_INSUFFICIENT, EVIDENCE_CONFLICT, TURN_LIMIT, SHOWING_REQUESTED, and SYSTEM_UNAVAILABLE.

Manual stop records the actor and immediately cancels only scheduled or retrying jobs with source_type tenant-chatbot for that conversation. Human intervention is any non-chatbot outgoing Email/SMS for the lead after activation. The pre-delivery gate cancels a claimed chatbot job if this occurs.

For credit, the property minimum comes from minimumCreditScore. A valid lead score must be 300-850. Missing credit causes an approved clarification question; a known score below the property minimum stops automation and records a neutral tenant-configurable response.

## Showing workflow

The chatbot collects a property, ISO-resolvable date/time in the tenant scheduling timezone, name, email or phone, and explicit confirmation. It creates a tenant_showing_request in submitted status. It does not auto-approve a showing or assign a realtor. Existing tenant approval creates the final tenant_showing record.

## Tenant interfaces

Chatbot Settings provides the master and channel switches, response threshold, response delay, maximum turns, safe fallback copy, credit response, and individual strict-stop toggles.

Test Chatbot provides property and audience selectors, question input, proposed answer, decision badge, score breakdown, matched sources, and an Improve Knowledge action. The action creates or edits a tenant knowledge item and reindexes it.

Lead activity exposes chatbot messages and events. Authorized staff can stop or resume a manually stopped conversation. Terminal policy stops other than MANUAL_STOP require starting a new conversation after the underlying issue is resolved.

## Superadmin interfaces

Superadmin can list, create, edit, activate, deactivate, and reindex platform knowledge. Platform records support LEAD or REALTOR audience and priority. All writes use the existing superadmin authentication boundary and audit log.

## Security and privacy

Tenant APIs require JWT, authenticated tenant isolation, plan permission, and tenant staff permission. Settings and knowledge management require settings permission; test, activity, and manual lead controls require lead permission. Public web chat requires resolved tenant host, published property, bounded input sizes, and a rate-limit-ready session identifier.

Qdrant payload never stores secrets, lead PII, raw owner contact data, or internal document content. Realtor-only text may be embedded, but the stored payload contains only identifiers and routing metadata; source text remains in PostgreSQL.

## Failure behavior

If Qdrant, the embedding model, tenant database, or channel provider is unavailable, the bot records SYSTEM_UNAVAILABLE and does not improvise. Test mode returns a diagnostic decision. Channel workers retry infrastructure failures according to existing queue policy, but never retry terminal policy stops.

## Verification

Every production behavior is introduced by a failing Jest test first. Tests cover settings normalization, tenant/audience filters, property field separation, evidence thresholds, conflicts, credit stops, human takeover races, manual stop cancellation, showing confirmation, idempotency, public validation, and pre-delivery authorization.

Frontend verification includes TypeScript, lint, production build, and targeted interaction coverage where the repository supports it. Final verification compares results to the recorded baseline of 39 passing and 11 failing backend suites before this feature.