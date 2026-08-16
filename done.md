# SaaS Multi-Tenant Project Checklist

> Use `[x]` only after a feature is implemented, tested, and verified. Keep unfinished work as `[ ]`.

## 1. Super Admin / Admin System

- [x] Add a separate Super Admin authentication flow.
- [x] Add a dedicated Super Admin dashboard.
- [x] Keep the existing normal user dashboard separate from the Super Admin dashboard.
- [x] Allow the Super Admin to create, edit, activate, deactivate, and delete subscription plans.
- [x] Allow an unlimited number of plans to be created.
- [x] Add plan permissions for the normal dashboard.
- [x] Add plan permissions for the property-management dashboard.
- [x] Allow a plan to include either one dashboard or both dashboards.
- [x] Allow the Super Admin to view all customers/tenants.
- [x] Allow the Super Admin to view tenant subscription details and expiration dates.
- [x] Allow the Super Admin to block or unblock a tenant.
- [x] Allow the Super Admin to extend a tenant subscription.
- [x] Add an activity/audit log so the Super Admin can see important tenant and administrative updates.

## 2. Public SaaS Website

- [x] Replace the current main-domain home page with a new SaaS landing page.
- [x] Create a new responsive design that matches the existing project design language.
- [x] Show all available plans on the landing page.
- [x] Show the features and permissions included in each plan.
- [x] Add clear purchase/signup actions for every plan.
- [x] Make the public website responsive and easy to use on desktop, tablet, and mobile.

## 3. Tenant Registration and Purchase

- [x] Create a tenant/customer account only after Stripe confirms the returned Checkout Session is complete and paid.
- [x] Allow the Super Admin to create a tenant/customer manually.
- [x] Collect the customer's business name during signup or manual creation.
- [x] Enforce a unique business name for every tenant.
- [x] Generate a unique tenant slug from the business name.
- [x] Automatically assign a unique subdomain from the primary domain.
- [x] Validate subdomain uniqueness before tenant creation.
- [x] Prevent reserved or invalid subdomain names.
- [x] Save the purchased plan and subscription dates for the tenant.
- [x] Assign the correct dashboard permissions from the purchased plan.
- [x] Handle failed purchases without creating an incomplete tenant database.

## 4. PostgreSQL Multi-Tenant Architecture

- [x] Use a master PostgreSQL database for global SaaS data.
- [x] Store primary tenant/customer records in the master database.
- [x] Store plans, subscriptions, domains, tenant status, and global audit logs in the master database.
- [x] Create a separate PostgreSQL database for every new tenant.
- [x] Create a tenant database when a customer purchases for the first time.
- [x] Create a tenant database when the Super Admin manually creates a new customer.
- [x] Run all required migrations when a tenant database is created.
- [x] Seed required default data in each new tenant database.
- [x] Store tenant-facing dashboard, property, lead, profile, tracking, and subscription data only in the resolved tenant database; block tenant accounts from legacy shared-data APIs.
- [x] Add a secure tenant database connection registry/configuration.
- [x] Add connection pooling and safe cleanup for tenant database connections.
- [x] Prevent cross-tenant access by matching authenticated tenant IDs to resolved domains, carrying request-scoped tenant DB context, validating server-generated database names, and blocking shared-data APIs for tenant accounts.
- [x] Add transaction/rollback handling if tenant provisioning fails.
- [x] Add a safe strategy for running future migrations across all tenant databases.
- [x] Add backup and restore planning for the master database and tenant databases.

## 5. Subdomain-Based Tenant Resolution

- [x] Add middleware/wrapper to detect the tenant from the request hostname.
- [x] Resolve the subdomain to the correct tenant record in the master database.
- [x] Connect each request to the correct tenant database.
- [x] Show the tenant's own public homepage when visiting its assigned subdomain, such as `business.example.com`.
- [x] Load all tenant public pages, listings, forms, and branding from the correct tenant database on the assigned subdomain.
- [x] Keep the main/root domain, such as `example.com`, routed to the SaaS landing page instead of a tenant homepage.
- [x] Reject unknown, blocked, inactive, or expired tenant subdomains.
- [x] Keep Super Admin routes isolated from tenant routes.
- [x] Make tenant resolution work without rewriting the entire backend where possible.
- [x] Add development support for testing tenant subdomains locally.

## 6. Custom Domain Management

- [x] Allow tenants to add a custom domain from their dashboard.
- [x] Save custom-domain details in the master database.
- [x] Provide DNS setup instructions to the tenant.
- [x] Verify custom-domain ownership before activation.
- [x] Route verified custom domains to the correct tenant.
- [x] Show the same tenant public homepage, pages, listings, forms, and branding on the verified custom domain, such as `www.customerbusiness.com`.
- [x] Make the tenant's assigned subdomain and verified custom domain use the same tenant database and application content.
- [x] Keep the assigned subdomain available as a fallback unless the tenant or Super Admin disables it.
- [x] Ensure a custom domain can never display another tenant's content.
- [x] Allow a tenant to remove or replace a custom domain safely.
- [x] Ensure custom domains use HTTPS in production.

## 7. Subscription Renewal and Repurchase

- [x] Allow an existing tenant to renew or repurchase a subscription.
- [x] Check whether the tenant already exists before provisioning.
- [x] Do not create a new tenant database during renewal or extension.
- [x] Extend the existing subscription expiration date correctly.
- [x] Update plan permissions when a tenant changes plans.
- [x] Preserve all existing tenant data during renewal or plan changes.
- [x] Handle expired subscriptions and reactivation correctly.
- [x] Record every purchase, renewal, extension, and plan change in the audit log.

## 8. Tenant Dashboard and Access Control

- [x] Allow a tenant to sign in from the main SaaS domain and enter its own tenant dashboard.
- [x] After login from the main domain, resolve the signed-in user's tenant and connect the dashboard to the correct tenant database.
- [x] Show only the dashboard modules allowed by the tenant's plan.
- [x] Restrict backend APIs based on plan permissions, not only the user interface.
- [x] Show subscription status and expiration information to the tenant.
- [x] Allow the tenant to renew or extend the subscription.
- [x] Allow the tenant to manage business/profile information.
- [x] Allow the tenant to manage its assigned subdomain where permitted.
- [x] Allow the tenant to manage its custom domain.
- [x] Display a clear message for blocked, expired, or unauthorized access.

## 9. Tenant GTM and Tracking Settings

- [x] Add a tenant settings page where the tenant can enter its Google Tag Manager container ID, such as GTM-XXXXXXX.
- [x] Allow the tenant to manage GTM after signing in through the main SaaS domain and entering its own dashboard.
- [x] Validate the GTM container ID format before saving it.
- [x] Store the GTM setting for the correct tenant only.
- [x] Load that tenant's GTM container on the tenant's assigned subdomain.
- [x] Load the same tenant GTM container on the tenant's verified custom domain.
- [x] Do not load one tenant's GTM container on another tenant's website.
- [x] Do not automatically load tenant GTM on the main SaaS landing page.
- [x] Allow the tenant to enable, disable, update, or remove its GTM container.
- [x] Prevent invalid or unsafe tracking-code input; accept a GTM container ID rather than unrestricted script code.

## 10. Security and Reliability

- [x] Add role-based access control for Super Admin, tenant owner, and tenant staff roles.
- [x] Validate and sanitize all tenant, plan, domain, and purchase inputs.
- [x] Secure tenant database credentials and never expose them to clients.
- [x] Add rate limiting to authentication, signup, purchase, and domain-verification endpoints.
- [x] Add secure password hashing and session/token handling.
- [x] Add idempotency protection for purchase and tenant-provisioning requests.
- [x] Add structured error handling and useful server logs.
- [x] Add monitoring for failed tenant provisioning, database connections, and subscription jobs.

## 11. Testing and Final Verification

- [x] Test Super Admin login and authorization.
- [x] Test plan creation and both dashboard-permission combinations.
- [x] Test first-time purchase and tenant provisioning.
- [x] Test manual tenant creation by the Super Admin.
- [x] Test unique business-name and subdomain validation.
- [x] Test master-database and tenant-database isolation.
- [x] Test subdomain routing to the correct tenant database.
- [x] Test blocked and expired tenant behavior.
- [x] Test renewal without creating a second tenant database.
- [x] Test subscription extension by the Super Admin.
- [x] Test plan upgrades and downgrades.
- [x] Test custom-domain verification and routing.
- [x] Test tenant login from the main SaaS domain and correct tenant resolution.
- [x] Test GTM save, validation, enable, disable, update, and removal.
- [x] Test that each tenant's GTM loads only on its own subdomain and verified custom domain.
- [x] Test that tenant GTM does not load on the main SaaS landing page or another tenant's website.
- [x] Test responsive layouts on desktop, tablet, and mobile.
- [x] Test that one tenant cannot read or modify another tenant's data.
- [x] Verify all critical actions appear in the audit log.
- [ ] Complete a final end-to-end SaaS purchase, provisioning, login, renewal, and expiration test.

## 12. Realtor Reports, Showing Requests, and Multi-Property Leads

- [x] Keep the platform Super Admin portal on `/super-admin` and tenant realtor operations on `/dashboard`.
- [x] Store owner-report recipients, properties, subjects, messages, channels, per-channel delivery results, sender, and sent time in the correct tenant database.
- [x] Add an Owner Reports table and a dedicated report detail page.
- [x] Prevent draft, archived, or otherwise inactive properties from collecting new lead links or showing requests.
- [x] Support one lead linked to multiple published properties through a tenant-local many-to-many relationship.
- [x] Merge repeated email or phone submissions into the existing lead instead of creating duplicate lead records.
- [x] Add reusable showing-form templates with custom fields and fixed-property or recipient-selected-property modes.
- [x] Add expiring, tenant-branded public showing-request links and show only published properties to recipients.
- [x] Store submitted answers, selected property, preferred time, request status, and audit activity in the tenant database.
- [x] Require manual showing-realtor assignment before approval.
- [x] Create the tenant Realtor Showings record automatically and transactionally when a submitted request is approved.
- [x] Add tenant dashboard metrics and navigation for Owner Reports, Showing Requests, and Realtor Showings.
- [x] Add migration coverage for existing version-1 tenant databases and focused tests for inactive-property rejection, duplicate-lead merging, published-property filtering, link expiration, and request approval.
- [x] Verify the NestJS production build and all 336 backend tests.
- [x] Verify the frontend TypeScript check, changed-file ESLint check, and Next.js production build.
- [x] Verify all 15 automated backend E2E tests.
- [ ] Run a live external SMTP/SMS delivery smoke test with deployment provider credentials and approved test recipients.
