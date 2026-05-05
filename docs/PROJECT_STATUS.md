# Tikd Project Status

Last reviewed: 2026-05-05

## Verification

Current local verification is green:

- `npm run lint`
- `npm run build`

Recent deploy cleanup:

- Fixed the Vercel TypeScript failure in `src/app/api/members/overview/route.ts`.
- Removed ESLint warnings reported by Vercel.
- Removed duplicate Mongoose schema index warnings in `Order`, `TrackingLink`, and `TrackingAttributionSession`.
- Updated the lint script from deprecated `next lint` to `eslint src`.
- Removed deprecated stub type packages for `bcryptjs` and `qrcode.react`.
- Updated dependencies and added safe overrides for `postcss`, `preact`, and `qs`.

Production audit note:

- `npm audit --omit=dev` still reports advisories through `next-auth` and its `nodemailer` or nested `uuid` chain.
- The suggested npm fixes require breaking dependency movement, so this should be handled as a planned auth/mail dependency task instead of a blind forced install.

## Ready Or Mostly Ready

The frontend surface is broad and mostly built:

- Public site pages, event discovery, event detail pages, checkout, checkout return, invite accept pages, gate page, help, demo form UI, and success pages are routable.
- Dashboard shell, sidebar, analytics pages, sales pages, friends, organizations, teams, events, ticket types, guests, promo codes, tracking links, finances UI, and settings screens are implemented.
- React Query is used heavily for dashboard data flows.
- Auth is implemented with NextAuth credentials, JWT sessions, registration, password reset, profile settings, notification settings, and availability checks.
- MongoDB/Mongoose models exist for users, events, organizations, teams, org roles, org/team/event members, tickets, ticket types, orders, promo codes, guests, friendships, notifications, page views, tracking links, tracking sessions, and invite tokens.
- Event CRUD, organization CRUD, team CRUD, member management, roles/permissions, guests, ticket types, promo codes, tracking links, notifications, search, friends, sales, and analytics API routes exist.
- Stripe PaymentIntent checkout exists, pending orders are created, webhooks finalize successful payments, paid tickets are created, stale pending orders can be reconciled, and tracking attribution increments ticket/revenue totals.
- Cloudinary signing and crop commit APIs exist for upload/image flows.
- Invite flows exist for organizations, teams, events, and scoped member invites.

## Partial Or Stubbed Areas

These are the main areas that still read as backend-incomplete:

- Organization settings API returns static defaults and the `PUT` endpoint only echoes input. See `src/app/api/organizations/[id]/settings/route.ts`.
- Organization finances API returns zeroed placeholder data. See `src/app/api/organizations/[id]/finances/route.ts`.
- Organization settings page still contains mock Stripe/onboarding IDs.
- Bug report and feedback APIs validate auth/input but do not persist or forward messages.
- Demo request UI posts to `/api/demo-requests`, but that API route is not present.
- Data upload modal has a stub upload hook; dashboard data modules need real persistence/export behavior.
- Connections hub mixes real organization rows with demo establishments/teams.
- Some analytics and chart details are derived or deterministic demo data where backend aggregate endpoints are not complete.
- Coupons are static in `src/lib/coupons.ts`; there is no database-backed coupon lifecycle outside promo-code routes.
- Payment flow checks ticket availability before PaymentIntent creation, but sold-count updates happen at finalization. Add atomic inventory guards or reservation semantics before production ticket drops.
- No automated test suite is wired for payment webhooks, inventory race conditions, permissions, invite acceptance, or dashboard API contracts.

## Key Backend Surfaces

Payments:

- `src/app/api/stripe/create-payment-intent/route.ts`
- `src/app/api/stripe/payment-status/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/internal/payments/reconcile-stale-orders/route.ts`
- `src/lib/payments/finalizeOrder.ts`
- `src/lib/payments/reconcileStalePendingOrders.ts`
- `src/models/Order.ts`
- `src/models/Ticket.ts`
- `src/models/TicketType.ts`

Organizations and access:

- `src/app/api/organizations/**`
- `src/lib/orgAccess.ts`
- `src/lib/orgPermissions.ts`
- `src/lib/orgRoles.ts`
- `src/models/Organization.ts`
- `src/models/OrgRole.ts`
- `src/models/OrgTeam.ts`

Events and ticketing:

- `src/app/api/events/**`
- `src/lib/eventAccess.ts`
- `src/models/Event.ts`
- `src/models/EventTeam.ts`
- `src/models/EventGuest.ts`
- `src/models/PromoCode.ts`

Tracking and attribution:

- `src/app/api/tracking-links/**`
- `src/lib/trackingAttribution.ts`
- `src/models/TrackingLink.ts`
- `src/models/TrackingAttributionSession.ts`

Auth and account:

- `src/lib/auth.ts`
- `src/app/api/auth/**`
- `src/app/api/settings/**`
- `src/models/User.ts`
- `src/models/ResetToken.ts`

## Environment Variables Seen In Code

Required or expected by current code paths:

- `MONGODB_URI`
- `MONGODB_DB`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `CRON_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `TIKD_PREVIEW_PASSWORD`
- `TIKD_PREVIEW_TTL_SECONDS`

## Maintenance Rules

- After any backend feature is completed, update `CODEX_TASKS.md` status and this file's relevant section.
- Keep `npm run lint` and `npm run build` green before handoff.
- Do not use `npm audit fix --force` without reviewing auth, mail, and Next.js behavior first.
- Treat payment, ticket inventory, permissions, and invite flows as high-risk areas that need tests before production.
