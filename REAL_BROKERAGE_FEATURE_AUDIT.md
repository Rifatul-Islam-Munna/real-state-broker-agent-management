# Website-Only Brokerage Feature Audit

## Summary

This audit captures the brokerage features to add or update based on the current project setup. No feature code is included here. This file is the review checklist before implementation.

Primary focus:

- Lead capture from this website only.
- Follow-up reminders.
- Showing scheduling.
- Listing management.
- Broker approval.
- Simple reports.

External capture sources are out of scope for now: Facebook, portal imports, WhatsApp inbound capture, email sync expansion, payments, blog-heavy tools, buyer portal complexity, and advanced analytics.

## Current Setup Found

- Website contact form exists and saves `ContactRequest`; users can manually convert it to `Lead`.
- Property chat exists and can auto-create or update `Lead` with source `Property Chat`.
- Lead CRM exists with stages, priority, notes, source, assigned agent text, and deal conversion.
- Follow-up history exists through lead history entries for notes, email, SMS, call, scheduled outreach, and background sending.
- Listing management exists with one property form, photo upload, agent assignment, and `Open` / `Closed` status.
- Deal pipeline exists with stages, value, commission rate, deadline, notes, and source lead.
- Reports exist for agent performance, revenue, lead source distribution, and top properties.
- Agent permissions exist as route-level access controls.
- Showing page exists but is static UI only; no backend booking records exist yet.

## Feature Updates To Review

### Lead Inbox, Website Only

- Unify website contact form, property chat, and future viewing requests into one lead/inquiry workspace.
- Skip Facebook, email sync, WhatsApp external capture, and portal sources for now.
- Track website sub-sources:
  - `Contact Form`
  - `Property Chat`
  - `Schedule Viewing`

### Lead Assignment

- Add assigned agent by real `AgentId`, not only agent name text.
- Add assignment rules by area/location, property type/listing type, and agent workload.
- Default rule:
  - Property chat and viewing requests use listing agent first.
  - If no listing agent exists, assign to active agent with lowest workload.

### Follow-Up Relief

- Add lead fields:
  - `nextActionDate`
  - `nextActionType`
  - `followUpStatus`
  - computed overdue flag
- Rename priority UX to:
  - `Hot`
  - `Warm`
  - `Cold`
- Map existing priority values safely:
  - `HighPriority` -> `Hot`
  - `Warm` -> `Warm`
  - `FollowUp` -> `Cold` or review-needed, depending on desired UX.
- Keep existing lead history for call/email/SMS logs.
- Add overdue follow-up alerts to dashboard and lead list.

### Showing Management

- Add real `ShowingBooking` entity.
- Required fields:
  - lead/contact reference
  - property reference
  - agent reference
  - start time
  - end time
  - status
  - notes
- Showing status values:
  - `Scheduled`
  - `Completed`
  - `Canceled`
  - `NoShow`
- Replace static schedule page with:
  - real property selector
  - available time slots
  - booking submit
  - admin/agent calendar
- Use existing communication templates and outreach system for confirmation and reminders.

### Listing Management

- Expand property status from `Open` / `Closed` to:
  - `Draft`
  - `PendingApproval`
  - `Active`
  - `UnderOffer`
  - `Sold`
  - `Rented`
  - `Unpublished`
- Keep current photo upload flow.
- Add document attachment link to listings through existing document repository or property-specific attachments.
- Add publish/unpublish actions.

### Broker/Admin Control

- Add listing approval before any listing goes live.
- Add price-change approval before active listing price updates.
- Add audit log for:
  - who changed listing
  - who changed lead
  - who changed deal
  - approval actions
  - price changes
  - status changes
- Keep current route permissions for now.
- Add team/area-scoped permissions later.

### Deal Pipeline

- Add checklist items per deal.
- Add expected closing date as real date field.
- Add deal owner as `AgentId`.
- Track commission:
  - commission amount
  - commission status
  - payout note
- Keep current deal stages unless owner wants brokerage-specific stage names later.

### Templates

- Keep existing templates.
- Add missing templates:
  - follow-up after visit
  - document request
  - deal update
  - closing congratulations
- Add WhatsApp as future channel only; no integration now.

### Reports

- Add cards/tables for:
  - leads this month
  - conversion by agent
  - active listings
  - sold/rented count
  - source-to-deal conversion
  - overdue follow-ups
  - commission summary
- Base reports on backend/database fields, not only frontend calculations.

## Suggested Implementation Order

1. Lead model updates: `AgentId`, next action fields, normalized priority UX, source sub-types.
2. Unified website inbox: contact form, property chat, schedule viewing.
3. Showing booking backend and calendar UI.
4. Listing statuses, approval flow, price-change approval, audit log.
5. Deal checklist, closing date, deal owner, commission tracking.
6. Template additions.
7. Backend-backed reports.

## Test Plan

- Verify website contact, property chat, and showing request appear in unified inbox.
- Verify assignment rule chooses correct agent by listing, area/type, then workload.
- Verify overdue follow-up appears after `nextActionDate` passes.
- Verify showing booking creates record, calendar item, status changes, and reminder history.
- Verify listing cannot become active without approval.
- Verify price change on active listing creates approval instead of direct update.
- Verify reports match seeded leads, deals, listings, showings, and commissions.

## Assumptions

- This file is the first implementation step only.
- No feature implementation should start until these items are approved or changed.
- External lead sources are skipped for now.
- Website sources only: contact form, property chat, schedule viewing.
- Existing C#/.NET backend, EF migrations, Next.js frontend, and current UI patterns stay.
