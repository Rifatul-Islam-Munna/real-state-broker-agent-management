# Property Operations Feature Parity

## Goal

Provide a dedicated Property Operations dashboard inside the broker and agent platform. Existing broker listings can be selected and imported into an operational portfolio without mixing rental, resident, maintenance, billing, and service workflows into the sales CRM.

## Source application inventory

The source property-management application exposes the following operational areas:

1. Properties and portfolio
2. Units
3. Tenants and residents
4. Property staff
5. Technicians and workers
6. Vendors
7. Vendor quotes
8. Maintenance tickets
9. Work orders
10. Recurring maintenance
11. Inspections
12. Assets
13. Rent and billing
14. Financial ledger
15. Subscriptions
16. Messaging
17. Announcements
18. Notification automation
19. Plans, uploads, and documents
20. Public request portals
21. Organization settings and branding
22. Audit logs
23. Operations analytics
24. AI operations assistance

## Implemented on `development-2`

- New admin-only route: `/dashboard/property-operations`
- New Property Operations item in the admin navigation
- Search and multi-select import from the existing managed property registry
- Separate operational workspace for each imported property
- All source feature areas represented as categorized modules
- Per-property module status: `Not started`, `In progress`, or `Ready`
- Progress summary and module category filtering
- Browser persistence for imported workspaces and module progress
- Backend workspace, module-state, and generic operational-record entities
- Extensible backend service for import, status changes, record CRUD, and module validation
- PostgreSQL migration for workspace, module-state, and operational-record tables

## Architecture

The broker platform remains the system of record for listings. Property Operations references an existing property by `property_id`; it does not copy or fork the listing. Operational records are attached to a workspace and categorized by a validated module key. This allows individual feature screens to be introduced without creating a different table and API contract for every small operational item.

## Remaining work for full same-to-same behavior

The current dashboard and persistence foundation are not yet a complete port of every workflow from the source application. Full parity still requires:

- Authenticated API endpoints exposing the new backend service
- Replacing browser persistence with the new API
- Dedicated CRUD interfaces for units, residents, staff, workers, vendors, tickets, work orders, maintenance schedules, inspections, assets, bills, ledger entries, announcements, messages, notifications, documents, audit logs, and public portals
- Payment, email, SMS, file-storage, and scheduled-job integration
- Role and permission rules for property managers, residents, workers, vendors, and staff
- Source-specific validation, automations, analytics, and AI behavior
- Database migration execution, automated tests, and production rollout verification

## Rollout recommendation

Build module-specific interfaces on top of the generic workspace and record foundation in vertical slices: portfolio and units first, then residents and billing, then maintenance and vendors, followed by communication, documents, analytics, and portals. Existing sales, CRM, showing, and marketing behavior should remain unchanged throughout the rollout.
