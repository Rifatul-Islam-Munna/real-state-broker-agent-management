# Final SaaS Verification Report

Verified on July 31, 2026.

## Automated backend verification

- NestJS production build: passed.
- Unit suites: 36 passed.
- Unit tests: 308 passed.
- HTTP e2e suites: 7 passed.
- HTTP e2e tests: 11 passed.

Coverage includes Super Admin authentication and authorization, plan CRUD and dashboard permission combinations, purchase idempotency, tenant provisioning, manual tenant creation, uniqueness validation, tenant database lifecycle, hostname resolution, blocked/expired tenants, subscription renewal/reactivation, plan changes, custom domains, GTM settings, role guards, input security, structured errors, and monitoring.

## Live PostgreSQL verification

Two uniquely named temporary tenant databases were created, migrated, seeded, queried, renewed, and removed.

Passed checks:

- Distinct physical PostgreSQL databases.
- Tenant identities remained isolated.
- Published listings remained isolated.
- GTM settings remained isolated.
- Renewal reused the existing database.
- Neither tenant database contained the other tenant's test listing.
- Temporary databases were dropped after the test.

## Frontend verification

- Targeted SaaS/multi-tenant ESLint: passed with zero errors and one Next.js image optimization warning.
- Next.js production build: passed.
- Generated routes: 66.
- Landing-page mobile, tablet, and desktop responsive assertions: passed.
- Tenant-site responsive assertions: passed.
- Registration responsive assertions: passed.
- Subscription-page responsive assertions: passed.
- Main SaaS domain GTM exclusion assertion: passed.
- Tenant-site conditional GTM assertion: passed.

## Audit verification

Implemented audit actions include:

- `plan.create`
- `plan.update`
- `plan.activate`
- `plan.deactivate`
- `plan.delete`
- `tenant.block`
- `tenant.unblock`
- `tenant.subscription.extend`
- `tenant.purchase.provision`
- `tenant.manual.provision`
- `tenant.subscription.renew`
- `tenant.subscription.repurchase`
- `tenant.plan.change`
- `domain.add`
- `domain.replace`
- `domain.verify`
- `domain.remove`
- `tenant.gtm.save`
- `tenant.gtm.enable`
- `tenant.gtm.disable`
- `tenant.gtm.remove`

## Known verification blockers

### Main-domain tenant login resolution

The login endpoint authenticates the user, but the signed-in dashboard does not yet bind all dashboard application requests to the tenant database using the authenticated owner's tenant record. This is part of the unfinished Section 8 work.

### Full application-level cross-tenant isolation

The tenant database infrastructure, public tenant routing, owner settings, domains, subscriptions, and GTM paths are isolated. However, older operational property, lead, mail, and dashboard services still use the master TypeORM connection. Therefore, a claim that every application API prevents cross-tenant access would be premature.

### Full lifecycle end-to-end test

A complete purchase -> provisioning -> main-domain tenant login -> tenant dashboard database resolution -> renewal -> expiration lifecycle cannot pass until main-domain tenant dashboard resolution is implemented. Purchase confirmation also still uses a purchase reference rather than a real payment-provider webhook.

## Repository-wide lint note

The full frontend repository lint command reports 42 pre-existing errors and 57 warnings in legacy/property-operations files. The failures are primarily `@ts-nocheck` bans, explicit `any` usage, and older hook/lint issues. The SaaS/multi-tenant files added or changed for this project pass targeted lint and production build.

## TypeORM warning

The e2e application test emits a PostgreSQL client deprecation warning from TypeORM's internal schema synchronization path (`RdbmsSchemaBuilder.dropOldIndices`). The stack trace does not point to application query code. Production should use migrations with TypeORM synchronization disabled.
