# Chatbot Operations Completion Design

## Goal

Complete tenant chatbot operations: activity visibility and retention, a professional test-chat interface, polished knowledge management, and template-driven confirmed showing requests.

## Backend

- Expose `GET /tenant-chatbot/activity` through existing tenant auth/permission guards. Return the existing seven-day, newest-first aggregate of chatbot messages and events.
- During each scheduled tenant worker pass, call `cleanupExpiredActivity(tenant)` for every eligible tenant. Cleanup failures are isolated and logged so inbound processing continues.
- Extend `ChatbotSettings` with nullable `showingRequestTemplateId`. Normalization accepts a non-empty bounded string or `null`.
- A confirmed showing is created only when explicit confirmation is true, property exists, preferred date/time is valid, and the lead has email or phone contact data.
- Resolve the selected active `LeadShowing` communication template from tenant agency settings. Render client, property, showing time, agent, and agency tokens into the showing-request title/message. Fall back to safe built-in confirmation copy when no valid template is selected.

## Frontend

- Add `AI Chatbot -> Bot Activity` navigation and `/dashboard/bot-activity` server/client page pair.
- Activity page provides text search, kind/channel/status filters, compact timeline rows, and expandable message/event details.
- Test Chatbot becomes a single chat workspace: searchable property picker, transcript bubbles, sticky bottom composer, and expandable evidence under assistant messages. Audience, channel, and raw property ID controls are removed; test calls use `LEAD` and `WEB` internally.
- Chatbot Settings loads active `LeadShowing` templates and offers a Showing request template selector.
- Improve Knowledge uses clearer section hierarchy, responsive two-column targeting controls, searchable property selection for create/edit, and compact indexed-item details without raw property-ID entry.

## Testing and Constraints

- TDD: add focused failing Jest/Node tests before each production change.
- Run backend chatbot suites and frontend source-contract tests. Do not run Next/Nest builds or lint; workspace `AGENTS.md` reserves them for the user.
- Add no dependencies. Reuse installed shadcn/Base UI components and semantic theme tokens.

## Conversation qualification extension

- Live conversations identify the visitor as prospective tenant/lead or Realtor before qualification-sensitive behavior. Verified Realtor directory matches may be recognized automatically; self-declared Realtors remain unverified until their email/phone matches the tenant Realtor directory.
- Unverified Realtors may receive non-sensitive Realtor description/context, but lockbox/access codes, entry instructions, owner contacts, internal remarks, commission information, and private showing instructions are filtered until verification succeeds.
- Lead qualification collects only two fields: credit score and monthly earning. Replies are parsed conservatively and saved to `tenant_lead.payload.creditScore` and `tenant_lead.payload.monthlyEarning`.
- Property minimum credit and monthly-income requirements come from structured property fields with verified description fallbacks. Below-minimum leads receive compatible published-property suggestions instead of a bare rejection.
- When both required fields are present and pass, the chatbot marks the lead showing-eligible and the web chat exposes the existing explicit date/time confirmation showing form. No showing request is created without explicit confirmation.
- Email/SMS chatbot replies are reactive only: the worker processes received incoming lead/realtor messages and never initiates a chatbot message before an inbound reply.
- Tenant and super-admin knowledge editors expose a main example question plus similar phrasings; all values continue to be stored in `questionExamples` and indexed with the verified answer.
- Built-in intent aliases cover natural variants including move-in/availability wording and smoke/vape/e-cigarette wording, while custom similar phrasings remain tenant/platform configurable.
