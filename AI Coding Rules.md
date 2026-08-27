# AI Coding Rules

These rules are mandatory for every AI agent working in this repository.

The main goal is to minimize tool calls, avoid repeated repository discovery, make changes safely, and complete development work as efficiently as possible.

---

# 1. Repository Discovery Strategy

## Graphify First

When Graphify is available and the repository has been indexed, use Graphify as the primary method for understanding the codebase.

Use Graphify for:

- Finding relationships between files
- Finding callers and callees
- Import/export relationships
- Controller → service → repository/model relationships
- Frontend → API → backend relationships
- Dependency analysis
- Impact analysis before changing shared code
- Understanding authentication flows
- Understanding tenant flows
- Understanding feature architecture
- Finding related components, hooks, services, DTOs, schemas, and tests

Do NOT repeatedly scan the entire repository when Graphify already contains the project structure.

Prefer:

```text
Graphify query
→ identify relevant files
→ read those files
→ modify
→ test
```

instead of:

```text
search
→ read
→ search
→ read
→ search imports
→ read more
→ search again
```

---

# 2. When To Use ripgrep / rg

Graphify does NOT completely replace `rg`.

Use `rg` when searching for an exact literal, identifier, string, route, environment variable, error message, or configuration value.

Examples:

```bash
rg "PRIVATE_UPLOAD_DIR"
rg "Invalid credentials"
rg "MailInboxSyncBackgroundService"
rg "/register/recruiter/agency"
rg "NEXT_PUBLIC_API_URL"
```

Do not use broad recursive searches repeatedly when Graphify can answer the architectural question directly.

General rule:

```text
Relationship/architecture question → Graphify

Exact string/symbol search → rg
```

---

# 3. Never Rediscover Known Project Structure

Once the repository structure has been discovered, reuse that knowledge.

Do not repeatedly inspect:

- the same directories
- package.json
- tsconfig files
- common modules
- known frontend folders
- known backend folders
- known test folders

unless there is evidence that they changed.

When starting work, first inspect existing project knowledge, Graphify data, git changes, and relevant files.

---

# 4. Batch Reads

Avoid reading files individually when several related files are already known.

Bad:

```text
read controller
read service
read dto
read schema
read test
```

Preferred:

```text
read controller + service + dto + schema + test together
```

Read only files related to the current feature.

Do not load hundreds of unrelated files into context.

---

# 5. Fast File Writing

For large file creation or large modifications, prefer terminal-based file operations over many tiny filesystem write calls.

Do NOT perform dozens of sequential 20–50 line writes when the same result can safely be produced in one terminal operation.

Preferred methods include:

- patch files
- scripted replacements
- PowerShell
- Node.js scripts
- Python scripts
- repository-aware patch commands

Use small targeted edit operations only when the change itself is small.

General rule:

```text
Small change → targeted edit

Large change → terminal patch/script

New large file → terminal write
```

---

# 6. Preserve Existing Code

Do not rewrite an entire file merely to change a few lines.

Always preserve unrelated functionality.

Before modifying shared code, inspect its callers and dependencies.

Use Graphify impact analysis where possible.

Do not perform unrelated refactoring unless it is required to complete the requested feature safely.

---

# 7. Understand Before Editing

Before implementing a feature or fixing a bug:

1. Identify the entry point.
2. Identify connected frontend/backend code.
3. Identify relevant schemas/models.
4. Identify existing tests.
5. Identify dependencies.
6. Understand the current behavior.
7. Determine the smallest correct change.

Never guess a file path or architecture when it can be discovered.

---

# 8. Follow Existing Architecture

Always follow patterns already used in the repository.

Examples:

- existing NestJS module structure
- existing DTO conventions
- existing guards
- existing Next.js server/client component patterns
- existing API client structure
- existing validation patterns
- existing error handling
- existing database models
- existing UI components
- existing test conventions

Do not introduce a second architecture for the same problem.

---

# 9. Do Not Mix Next.js Server And Client Components

For Next.js projects:

Do not accidentally use client-only functionality inside Server Components.

Client functionality includes things such as:

```text
useState
useEffect
useRouter
browser APIs
event handlers
client-only libraries
```

Add `"use client"` only where it is actually required.

Do not convert large page trees into Client Components unnecessarily.

---

# 10. Backend Changes Must Be End-To-End

For backend features, inspect and update every required layer.

Typical NestJS flow:

```text
Controller
→ DTO
→ validation
→ service
→ model/schema/repository
→ authorization
→ response
→ tests
```

Do not implement only the controller or only the database layer.

---

# 11. Frontend Changes Must Be End-To-End

For frontend features inspect:

```text
route/page
→ component
→ API call
→ loading state
→ success state
→ validation
→ error state
→ responsive behavior
→ tests
```

A feature is not complete merely because the UI exists.

---

# 12. Validate API Contracts

Whenever frontend and backend communicate, verify:

- request body
- route
- HTTP method
- query parameters
- response structure
- status codes
- validation
- authorization

Never assume frontend and backend types match.

---

# 13. Tests Are Mandatory

Every meaningful feature or bug fix must have appropriate tests.

Use the project's existing test framework.

Possible tests include:

- unit tests
- integration tests
- API tests
- Playwright E2E tests

For bug fixes, add or update a regression test whenever practical.

Do not claim something works simply because the code looks correct.

---

# 14. Run Focused Tests First

After a change, run the smallest relevant test first.

Example:

```text
changed auth service
→ run auth tests

changed recruiter registration
→ run recruiter registration tests

changed mail parser
→ run mail parser tests
```

Only run the complete test suite when needed.

This keeps development fast.

---

# 15. Verify Before Declaring Completion

Before saying a task is finished:

- ensure modified code compiles
- run relevant tests
- check lint/type errors where applicable
- inspect git diff
- verify no unrelated files were changed
- verify no debug code remains
- verify no temporary files remain

Never claim success without verification.

---

# 16. Do Not Break Existing Features

Bug fixes and new features must not knowingly break existing functionality.

Before changing shared code:

```text
Graphify impact analysis
→ inspect consumers
→ modify
→ run affected tests
```

When a change affects multiple roles or modules, test all affected flows.

---

# 17. Prefer Surgical Changes

Make the smallest correct change.

Avoid:

- unnecessary rewrites
- formatting entire files
- renaming unrelated variables
- reorganizing unrelated folders
- dependency upgrades without need
- mass refactors during a bug fix

Keep git diffs focused.

---

# 18. Reuse Existing Components And Utilities

Before creating anything new, search for an existing:

- component
- service
- hook
- helper
- utility
- guard
- decorator
- validator
- DTO
- schema
- API wrapper

Prefer reuse over duplication.

---

# 19. Avoid Temporary Files

Do not leave temporary scripts or generated debug files in the repository.

If a temporary script is required:

1. create it
2. use it
3. delete it before completion

Do not commit temporary debugging artifacts.

---

# 20. Use The Terminal Efficiently

Prefer one useful terminal command over many tiny tool operations.

Examples:

```bash
git status
git diff --stat
git diff
rg "target"
npm test -- target
npm run typecheck
```

Combine safe read-only commands when doing so reduces unnecessary round trips.

---

# 21. Do Not Run Expensive Searches Without Need

Avoid recursively processing directories such as:

```text
node_modules
.next
dist
build
coverage
.git
tmp
cache
vendor
```

unless specifically required.

Graphify indexing and searches should exclude generated/dependency directories.

---

# 22. Keep Graphify Updated

When Graphify is configured for this repository, keep its graph synchronized with meaningful repository changes.

The graph should represent the current source tree.

Do not rebuild the entire graph unnecessarily if incremental updating is supported.

Generated dependency/build directories must not be indexed.

---

# 23. Preferred AI Workflow

For every development task, use this sequence whenever applicable:

```text
1. Read the user's request
2. Inspect git status
3. Check existing repository/project knowledge
4. Query Graphify for architecture/relationships
5. Use rg only for exact searches when necessary
6. Batch-read the relevant files
7. Understand the existing implementation
8. Determine the smallest safe change
9. Modify using targeted edits or terminal patches
10. Run focused tests
11. Fix any discovered problem
12. Run typecheck/lint/build when relevant
13. Inspect git diff
14. Remove temporary files
15. Report exactly what changed and what was tested
```

---

# 24. Minimize Tool Calls

Tool efficiency matters.

Avoid patterns such as:

```text
search one thing
read one file
search another thing
read another file
write 30 lines
write another 30 lines
write another 30 lines
```

Prefer:

```text
Graphify architecture query
→ one exact search if needed
→ batch read
→ one coherent modification
→ focused verification
```

The goal is fewer operations without reducing correctness.

---

# 25. Accuracy Is More Important Than Guessing

Never invent:

- routes
- files
- database fields
- API contracts
- environment variables
- features
- existing behavior

Inspect the repository.

If information exists in code, use the code as the source of truth.

---

# 26. Continue Through Fixable Errors

When an implementation encounters a normal coding error:

- investigate it
- fix it
- rerun the relevant test

Do not stop merely because the first implementation attempt failed.

Use debugging evidence rather than random changes.

---

# 27. Protect User Work

Never delete, reset, overwrite, revert, or discard existing user changes unless explicitly required.

Before making potentially destructive operations, inspect:

```bash
git status
git diff
```

Do not use commands such as destructive resets simply to make development easier.

---

# 28. Final Completion Report

At the end of development work, report concisely:

```text
Changed:
- ...

Verified:
- ...

Tests:
- ...

Remaining:
- ...
```

Do not claim a test passed unless it was actually executed.

---

# Core Principle

The preferred development architecture is:

```text
Graphify
   ↓
Understand relationships and locate code
   ↓
Batch-read exact relevant files
   ↓
Terminal / targeted edits
   ↓
Focused tests
   ↓
Git diff verification
```

Use:

```text
Graphify = codebase intelligence
rg = exact text search
Terminal = fast filesystem operations
Desktop Commander = local machine access
Tests = proof that the change works
Git = change verification
```

Optimize for:

**speed + accuracy + minimum tool calls + safe changes + complete verification.**