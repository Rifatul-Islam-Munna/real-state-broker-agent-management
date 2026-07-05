# Property Operations NestJS API

This service is the only active backend for the Property Operations Manager. The existing broker backend remains unchanged and continues to serve the rest of the product.

## Architecture

- NestJS 11
- MongoDB with Mongoose
- Admin authentication using the same JWT secret as the broker backend, or an optional server-side admin key
- S3-compatible object storage for images and documents
- Stripe Checkout for QR/public billing payments
- Email, SMS and WhatsApp delivery through configurable provider webhooks
- Hourly overdue and recurring-maintenance automation

## Local setup

```bash
cd nestjs-backend
cp .env.example .env
npm install
npm run start:dev
```

The API listens on port `4100` by default and uses the global prefix `/api`.

Configure the frontend with:

```env
PROPERTY_OPERATIONS_API_URL=http://localhost:4100/api
PROPERTY_OPERATIONS_ADMIN_KEY=
```

The frontend proxy forwards the existing `access_token` cookie to this service. `ACCESS_TOKEN` in the NestJS environment must use the same JWT signing secret as the broker backend.

## Required environment variables

- `MONGODB_URL`
- `ACCESS_TOKEN`
- `PUBLIC_APP_URL`
- `CORS_ORIGIN`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_PUBLIC_URL`

Optional:

- `PROPERTY_OPERATIONS_ADMIN_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_DEFAULT_CURRENCY`
- `PROPERTY_OPERATIONS_EMAIL_WEBHOOK`
- `PROPERTY_OPERATIONS_SMS_WEBHOOK`
- `PROPERTY_OPERATIONS_WHATSAPP_WEBHOOK`

## Access model

Only administrators sign in. Residents, workers, technicians, vendors, inspectors and other external contacts use expiring secure links or QR codes. Tokens are stored only as SHA-256 hashes. Links support expiry, revocation, one-time access, maximum uses, public uploads, form submissions, Stripe payments and restricted ticket/work progress updates.

## Main routes

Admin routes are under `/api/property-operations` and require an admin JWT or admin key.

Public routes are under `/api/property-operations/public/:token` and require only a valid secure token.

The frontend consumes the service through `/api/property-operations-proxy/...`.
