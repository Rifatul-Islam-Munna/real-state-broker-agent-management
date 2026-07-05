# Property Operations NestJS API

Property Operations runs in NestJS while reusing the main project's PostgreSQL database and integrations. The existing broker backend remains responsible for listings, agents, leads and deals.

## Shared architecture

- NestJS 11 with TypeORM
- The same PostgreSQL connection used by the main project
- The same JWT signing secret and administrator role claims
- The same MinIO endpoint, bucket and credentials
- Branding and currency from `agency_settings`
- Email, SMS, WhatsApp, AI and payment provider settings from `agency_integration_settings`
- No MongoDB, Mongoose, separate S3 configuration, Property Operations admin key, Stripe-only secret, or duplicate notification webhooks

Only Property Operations tables are registered in TypeORM. Operational preferences such as link expiry and public-form requirements are stored in the generic operations record table; global company and integration settings remain single-source in the main dashboard.

## Local setup

```bash
cd nestjs-backend
cp .env.example .env
npm install
npm run build
npm run start:dev
```

The API listens on port `4100` by default with prefix `/api`. The frontend proxy forwards the existing `access_token` cookie.

The frontend may use `PROPERTY_OPERATIONS_API_URL` when the NestJS service has a separate internal address. It otherwise falls back to the shared backend URL.

## Access model

Only administrators sign in. Residents, workers, technicians, vendors, inspectors and other external contacts use expiring secure links or QR codes without accounts. Access codes are stored as SHA-256 checksums and support expiry, revocation, one-time/max-use access, MinIO uploads, form responses, configured-provider payments and restricted progress updates.

## Routes

Admin APIs: `/api/property-operations`

External APIs: `/api/property-operations/public/:token`

Frontend proxy: `/api/property-operations-proxy/...`
