# Codex Task Board

Last reviewed: 2026-05-05

Use this file as the working checklist for future Codex sessions. Preserve task IDs, update status, and add the commit/build verification when a task moves.

Status legend:

- `done`: implemented and verified.
- `in_progress`: active but not production-complete.
- `todo`: not implemented or still stubbed.
- `blocked`: needs product, vendor, or credential decision.

## Recently Completed

| ID | Status | Task | Verification |
| --- | --- | --- | --- |
| TIKD-DEPLOY-001 | done | Fix Vercel build failure in members overview route. | `npm run build` |
| TIKD-DEPLOY-002 | done | Remove ESLint warnings from Vercel log. | `npm run lint` |
| TIKD-DEPLOY-003 | done | Remove duplicate Mongoose index warnings. | `npm run build` |
| TIKD-DEPLOY-004 | done | Replace deprecated `next lint` script with ESLint CLI. | `npm run lint` |
| TIKD-DEPS-001 | done | Remove deprecated stub typings and safe transitive advisories. | `npm ls q @types/qrcode.react @types/bcryptjs --depth=0`; `npm audit --omit=dev` |

## Backend Priorities

| ID | Status | Priority | Task | Main files | Done when |
| --- | --- | --- | --- | --- | --- |
| TIKD-BE-001 | todo | P0 | Add atomic ticket inventory protection for checkout and finalization. | `src/app/api/stripe/create-payment-intent/route.ts`, `src/lib/payments/finalizeOrder.ts`, `src/models/TicketType.ts`, `src/models/Order.ts` | Concurrent purchases cannot oversell; finalization uses guarded updates or reservations; stale pending orders release or expire cleanly; tests cover race cases. |
| TIKD-BE-002 | todo | P0 | Add payment webhook and order lifecycle tests. | `src/app/api/stripe/webhook/route.ts`, `src/lib/payments/finalizeOrder.ts`, `src/lib/payments/reconcileStalePendingOrders.ts` | Tests cover success, duplicate webhook, cancelled/failed intent, expired pending order, missing order, and already-finalized order. |
| TIKD-BE-003 | todo | P0 | Decide and implement Stripe Connect or ledger model for organizers. | `src/app/api/organizations/[id]/finances/route.ts`, `src/app/api/organizations/[id]/settings/route.ts`, finance dashboard pages | Organization finance data comes from Stripe Connect and/or an internal ledger; payout/dispute/balance UI uses real data. |
| TIKD-BE-004 | todo | P1 | Persist organization settings. | `src/app/api/organizations/[id]/settings/route.ts`, `src/models/Organization.ts` or new settings model, `src/app/dashboard/organizations/[id]/settings/page.tsx` | `GET` reads saved settings; `PUT` validates and persists terms, fee display settings, and Stripe/account fields; mock IDs are removed. |
| TIKD-BE-005 | todo | P1 | Implement support intake persistence and notifications. | `src/app/api/bug-report/route.ts`, `src/app/api/feedback/route.ts`, optional new model | Feedback and bug reports are saved or forwarded with user context, created time, type, and status; dashboard/admin retrieval path is decided. |
| TIKD-BE-006 | todo | P1 | Add `/api/demo-requests`. | `src/app/demo/page.tsx`, new `src/app/api/demo-requests/route.ts` | Demo form submits successfully, validates input, persists or emails lead data, and returns clear UI states. |
| TIKD-BE-007 | todo | P1 | Replace dashboard data upload stubs with real backend storage. | `src/components/dashboard/data/UploadFileModal.tsx`, `src/app/dashboard/data/**`, new API/model as needed | Upload, list, download/export, and delete flows work against real persistence with org/user scoping. |
| TIKD-BE-008 | todo | P1 | Complete backend aggregates for analytics pages. | `src/app/api/analytics/**`, `src/lib/api/**`, dashboard chart pages | Revenue, tickets sold, page views, gender, age, and member charts use real scoped aggregates and consistent date filters. |
| TIKD-BE-009 | todo | P1 | Finish real connections data. | `src/app/dashboard/connections/ConnectionsHubClient.tsx`, organizations/teams/friends APIs | Demo establishments/teams are replaced with real endpoints or hidden until supported. |
| TIKD-BE-010 | todo | P1 | Move coupons/promotions into database-backed lifecycle. | `src/lib/coupons.ts`, `src/app/api/events/[id]/promo-codes/**`, `src/models/PromoCode.ts` | Checkout applies event/org-scoped promo rules from DB; static demo coupon usage is removed or explicitly dev-only. |
| TIKD-BE-011 | todo | P2 | Build backend contract tests for permissions and invites. | `src/lib/orgAccess.ts`, `src/lib/eventAccess.ts`, invite APIs, team/org/event member APIs | Tests cover owner/admin/member role boundaries, invite expiry, duplicate acceptance, revoked access, and scoped roles. |
| TIKD-BE-012 | blocked | P2 | Resolve remaining production audit items in auth/mail chain. | `package.json`, `src/lib/auth.ts`, `src/lib/mail.ts` | NextAuth/Nodemailer/uuid advisories are resolved through a reviewed upgrade path, likely Auth.js migration or compatible mail provider change. |

## Frontend Follow-Up

| ID | Status | Priority | Task | Main files | Done when |
| --- | --- | --- | --- | --- | --- |
| TIKD-FE-001 | todo | P1 | Replace or productize mock values in organization settings. | `src/app/dashboard/organizations/[id]/settings/page.tsx` | No mock Stripe/onboarding IDs render in production. |
| TIKD-FE-002 | todo | P2 | Review image strategy after disabling `@next/next/no-img-element`. | many dashboard/public components | Either keep raw `<img>` intentionally with documented remote-image reasoning, or migrate stable assets to `next/image` with configured domains. |
| TIKD-FE-003 | todo | P2 | Smoke-test restored event/team invite modal flow. | `src/app/dashboard/organizations/[id]/events/[eventId]/team/page.tsx`, invite modal | Add-member flow opens modal, validates roles, sends invite, and refreshes list. |

## Standard Codex Checks

Run these before handoff:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

For payment work, also manually verify:

- Create PaymentIntent from checkout.
- Complete Stripe test payment.
- Confirm webhook finalizes order once.
- Confirm tickets are created and visible in `account/my-tickets`.
- Confirm stale pending order reconciliation marks expired or finalizes succeeded intents.

For docs upkeep:

- Move finished tasks to `done`.
- Add the relevant verification command or manual test.
- Update `PROJECT_STATUS.md` when a stub becomes real backend behavior.
