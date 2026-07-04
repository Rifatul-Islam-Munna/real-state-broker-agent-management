# Lead collection templates

Inbound mailbox messages are processed in this order:

1. Match active templates using sender patterns, subject rules, and static body fingerprints.
2. Extract mapped Lead fields using the saved text anchors.
3. Accept the result when its confidence meets the template threshold and all required fields exist.
4. Use the existing local fallback parser for inexpensive supplemental values.
5. Call the configured AI provider only when the template result is unmatched, incomplete, or below its confidence threshold.

Fingerprints are rebuilt after field mapping so sample names, email addresses, phone numbers, property addresses, and other selected dynamic values are excluded from the matching signature.

Each imported inbox message stores the extraction method, confidence, matched template, diagnostics, and whether AI fallback was used. Template counters track matches, successful AI-free parses, and AI fallbacks.

The production database migration is `migrations/20260704_lead_collection_templates.sql`.
