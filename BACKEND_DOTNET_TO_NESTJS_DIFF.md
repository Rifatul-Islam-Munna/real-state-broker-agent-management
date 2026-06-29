# .NET Backend vs NestJS Backend Contract Audit

Goal: frontend can switch only the API base URL, with same paths, query/body names, and response shapes.

## Current Status

Static route check result:

- .NET frontend routes found: 84
- NestJS routes found: 103
- Missing .NET routes in NestJS: 0

NestJS has extra `/api/brokerage/...` routes. Extra routes do not block the old frontend contract.

## Fixed In NestJS

- Added all missing .NET-compatible routes, including:
  - `/api/website-inquiries`
  - `/api/showings`
  - `/api/showings/availability`
  - `/api/brokerage/approvals`
  - `/api/lead-assignment-rules`
  - `/api/reports/brokerage`
- Matched paginated response shape:
  - `items`
  - `totalCount`
  - `page`
  - `pageSize`
  - `totalPages`
  - `hasNextPage`
  - `hasPreviousPage`
- Matched request/response contracts for auth, users/agents, properties, leads, lead history, lead outreach, deals, documents, contact requests, blogs, mail inbox, upload, property chat, settings, homepage, marketing, dashboard, brokerage workflows, and dev migration route.
- Matched delete status behavior to `204` where .NET returns no content.
- Matched auth token support for both Bearer token and `access_token` header.
- Matched agent route permission behavior for protected frontend sections.
- Matched agency settings schema/shape to `.NET`:
  - table: `agency_settings`
  - stored payload: `content_json`
  - returned shape: `profile`, `communicationTemplates`, `updatedAt`
- Matched lead outreach templates to agency settings.
- Matched `/api/lead-outreach/call-script` as anonymous XML response.
- Added real IMAP inbox sync with `imapflow` + `mailparser`:
  - imports unread messages
  - respects folder, interval, and max-message settings
  - deduplicates imported mail
  - matches or creates leads
  - marks mail read only after DB processing succeeds
  - prevents overlapping manual/scheduled runs
  - reports the same sync counters/status fields as .NET
- Matched key entity relations used by frontend flows:
  - property pre-questions
  - lead history
  - lead/contact/mail/deal links
  - property chat/property/lead links
  - showing/property/lead/agent links
  - assignment rule/agent links
  - approval/property links
- Enforced the same route roles:
  - Admin-only settings, homepage, marketing, blogs, documents, agent management, approvals, and assignment rules
  - Admin/Agent routes reject Client users
  - Agent feature permissions now also cover showings and website inquiries
- Replaced the old flat dashboard counters with the same `.NET` response sections:
  - `overview`
  - `topAgents`
  - `alerts`
  - `visits`
- Aligned homepage and marketing singleton tables to `.NET` `content_json` storage and response payloads.
- Lead history now includes stored history, linked inbox mail, and linked contact requests with the same synthetic IDs and timeline ordering.
- Document repository now supports every `.NET` filter, validation rule, and summary counter.
- Blog detail now requires a slug, returns published posts only, validates writes, and generates unique slugs.
- Removed Nest-only blog DB columns from the active entity mapping so NestJS does not select columns that do not exist in the `.NET` schema.
- Property chat conversation/message enums now use the same numeric PostgreSQL storage as `.NET` while returning string enum names to the API.
- Property pre-question relation now includes `.NET` timestamps and required-default behavior.
- Property create/update now mirrors `.NET` agent approval behavior:
  - Agent live-listing publish requests become `PendingApproval`
  - Agent active-listing price changes create approval requests
  - Admin changes apply directly
- Lead create/update and contact conversion now run the same assignment/audit flow as `.NET`.
- Showing creation now applies lead assignment, writes scheduled lead history, and uses the `.NET` response shape.
- Brokerage approvals now use `.NET` body field `approvalId`, apply approved price/status changes to the property, and return `.NET` approval response shape.
- Lead assignment rules now return `agentName`, include inactive rules like `.NET`, and sort by priority/area.
- Brokerage reports now return the `.NET` report shape:
  - `leadsThisMonth`
  - `conversionByAgent`
  - `activeListings`
  - `soldRentedCount`
  - `sourcePerformance`
  - `overdueFollowUps`
  - `commissionSummary`
- Removed dependency on the Nest-only `website_inquiry` table for active route behavior; unified inquiry data is read from `.NET` contact, chat, and showing tables.
- `POST /api/mail-inbox` is anonymous like `.NET`; conversion reuses existing leads and returns the full lead response.
- Aligned PostgreSQL integer enum storage while preserving string enum API responses for users, properties, leads, deals, mail, contact requests, documents, lead history, showings, approvals, and assignment rules.
- TypeORM schema synchronization now defaults off to prevent NestJS from rewriting the existing `.NET` database schema. Set `TYPEORM_SYNCHRONIZE=true` only for a disposable Nest-only database.

## Remaining Runtime Differences

These are not frontend contract blockers, but cannot be guaranteed identical by static code patch only:

| Area | Difference |
|---|---|
| External SMS/email/call delivery | NestJS records the same outreach history/status shape, but provider side effects depend on real provider clients/config. |
| DB migration engine | NestJS route returns the same response shape, but TypeORM migration behavior is not EF Core behavior. |
| Existing encrypted integration settings | .NET Data Protection payloads are not readable by Node. Existing SMTP/IMAP credentials saved by .NET must be submitted once through the NestJS integration settings endpoint. New NestJS-saved settings work normally. |
| Runtime proof | I did static verification only. Per your instruction, I did not build, lint, or run NestJS/.NET apps. |

## Latest Check

- Route parity: OK
- Missing .NET routes in NestJS: 0
- Body/query naming parity: OK by controller scan and DTO/service mapping
- Response shape parity: OK for frontend-facing routes after mapper fixes
- Entity relation parity: OK for frontend-used relations after TypeORM relation fixes
- TypeScript syntax parse: OK
- Git diff whitespace check: OK
