# Chatbot Semantic Retrieval Design

## Goal
Make the property chatbot understand broad paraphrases without manually enumerating hundreds of questions, answer only from verified property/tenant/platform facts, avoid false evidence conflicts, remain safe for Realtor-only data, and run acceptably on a low-resource CPU VPS.

## Embedding model
Use `Snowflake/snowflake-arctic-embed-xs` as the default local embedding model. It is a 22M-parameter, 384-dimensional retrieval model, so the existing Qdrant vector dimension remains compatible. Queries use Snowflake's retrieval query prefix and CLS pooling; documents use CLS pooling without the query prefix. Keep `CHATBOT_EMBEDDING_MODEL` configurable so `Snowflake/snowflake-arctic-embed-s` can be enabled later without code changes if a tenant/operator accepts the extra CPU/RAM cost.

Inference is CPU-only and serialized through a small in-process queue (default concurrency 1) so bursts do not create parallel ONNX workloads on a low-VPS machine. The model remains warmed once per process. Correctness is preferred over instant response latency.

## Retrieval and ranking
Qdrant remains the candidate generator. Retrieval combines embedding similarity with deterministic topic/fact matching and lexical overlap. Regex/topic rules are not the primary understanding mechanism; they are high-precision boosters/fallbacks.

Each property knowledge chunk has a stable fact/topic identity derived from `sourceKey`/title. Related but distinct facts remain separate, e.g. landlord monthly income, HOA annual income, DTI, proof-of-income documents. Ranking selects the best topic cluster first, then keeps compatible supporting facts from that cluster/family.

## Conflict detection
Only evidence about the same canonical fact may conflict. Different income requirements, fee types, deposit types, approval times, or landlord-vs-HOA rules are complementary evidence, not conflicts. A conflict is raised only when two verified records with the same fact identity disagree materially (for example `Pet policy: No pets` vs `Pet policy: Pets allowed`).

## Human answer composition
Responses are deterministic NLG over verified evidence. The bot may combine several compatible facts into a concise human response, but it never generates unsupported property claims. For income questions it may answer landlord monthly income, HOA yearly income, DTI, and proof requirements together when relevant.

## Showing intent
Showing/rental-intent phrases such as `I want to rent this`, `give me the showing form`, `how do I request a showing`, `can I see the property`, and semantic equivalents are recognized as workflow intent, not normal knowledge questions. If role/credit/income are missing, the bot answers the request positively and asks only for the next missing qualification item. If qualification passes, the response marks showing eligibility and exposes the existing explicit date/time showing form. A showing request is created only after explicit confirmation.

## Safety and channels
Safe public property facts are answered before qualification follow-ups. Realtor-only sensitive facts remain filtered until directory verification. Email/SMS remain reactive to inbound messages only. Lead credit score and monthly earning are the only qualification fields collected.

## Reindex/versioning
Embedding metadata carries a model signature. When the configured embedding model changes, property/tenant/platform knowledge must be reindexed before its vectors are trusted. Existing 384-dimensional Qdrant collection can be reused for Arctic-xs or Arctic-s, but mixed-model vectors are not allowed.

## Verification
Add regression tests for the user's income paraphrases, false-conflict cases, same-fact true conflicts, showing-request intent, qualification gating, serialized embedding calls, query prefix/CLS pooling, and semantic corpus accuracy. Run focused chatbot suites, frontend chatbot tests, Nest build, focused lint, and chatbot-scoped TypeScript checks before completion.
