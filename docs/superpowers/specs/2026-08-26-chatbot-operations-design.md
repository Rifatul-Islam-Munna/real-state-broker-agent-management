# Chatbot Operations and Admin UX Design

## Goal
Build one coherent tenant chatbot operations experience: reliable Gmail disconnect behavior, per-lead bot stop/resume controls, a 7-day Bot Activity audit page, and a professional test-chat/knowledge-management UI.

## Approved behavior
- Gmail background sync must skip disconnected Gmail accounts and must not attempt token refresh after disconnect.
- Disconnect must clear Gmail OAuth connection state used by scheduled sync.
- Lead Activity must show chatbot state and allow Stop bot / Resume bot per lead.
- Manual stop cancels pending chatbot-owned outbound jobs and blocks new bot replies until resumed.
- Add a tenant Bot Activity page under AI Chatbot in the sidebar.
- Bot Activity shows only the last 7 days and old bot activity is physically purged from tenant DB.
- Bot Activity shows lead, property, channel, direction, message, decision/reason, timestamp, and active/stopped conversation state.
- Test Chatbot becomes a normal chat UI with only an optional searchable property picker and message composer.
- No manual audience/channel selector in Test Chatbot.
- Real conversations auto-detect verified Realtors from the tenant Realtor directory by sender email/phone.
- Text claiming to be a Realtor never grants private Realtor knowledge.
- Identity-free test chat remains lead-safe.
- Improve Knowledge targeting UI remains property-aware, searchable, and visually clear on desktop/mobile.
