# Trimlly Remediation Tasks

**Code-remediation status:** Complete for the agreed existing-app bug/security scope.

## P0 — Security and authorization
- [x] Prevent profile API role escalation.
- [x] Enforce authenticated/active sessions for protected APIs.
- [x] Lock barber create/update/delete to the owner or explicit administrator route.
- [x] Lock booking create/read/update to the authenticated actor.
- [x] Enforce server-controlled booking status transitions.
- [x] Reject unknown services and client-controlled initial status.
- [x] Prevent overlapping barber/customer reservations with conflict checks and unique minute reservations.
- [x] Revalidate hours, conflicts, service availability and end time on reschedule.
- [x] Add atomic booking-state preconditions to prevent concurrent status overwrites.
- [x] Normalize DB selection to one database name.
- [x] Replace in-memory rate limiting with MongoDB-backed rate limiting.
- [x] Refresh role/account state from DB and invalidate stale sessions.
- [x] Protect last-admin/self-admin mutations with a distributed MongoDB lock and audit logs.
- [x] Add same-origin protection to custom state-changing APIs.
- [x] Add baseline HTTP security headers and remove the framework-powered header.

## P1 — Booking and data integrity
- [x] Add booking state definitions and reservation-key helpers.
- [x] Add timezone-aware booking validation helpers.
- [x] Add unique/query/TTL indexes for users, barbers, bookings, tokens, notifications, rate limits and locks.
- [x] Store booked price, service ID/name and duration snapshots.
- [x] Add available-slot API and use it in booking/rescheduling UI.
- [x] Enforce lead time, booking horizon, closed days, working hours and slot intervals.
- [x] Fix current waiting-time calculation so distant future appointments do not inflate the present wait.
- [x] Expire stale pending requests and add completion/no-show states.
- [x] Prevent completion before the scheduled service end time.
- [x] Notify the correct customer/barber after booking actions and account/profile invalidation.
- [x] Add barber verification workflow; unverified/legacy profiles are not public until approved.
- [x] Preserve compatibility with legacy bookings that stored barber owner IDs.
- [x] Cancel/release active reservations when a barber/customer account becomes unavailable.

## P2 — Authentication
- [x] Add credential-account email verification.
- [x] Block newly registered credential accounts until verified.
- [x] Add resend-verification flow with token rotation and rate limiting.
- [x] Treat verified Google provider emails as verified while preserving existing account roles.
- [x] Add password-reset flow with single-use, expiring tokens.
- [x] Hide Google OAuth when credentials are not configured.
- [x] Normalize email casing for authentication.
- [x] Strengthen credential password minimum and hash new passwords with bcrypt cost 12.
- [x] Remove obsolete custom JWT login implementation.
- [x] Remove incompatible/unused Auth.js MongoDB adapter and stale lockfile dependency entries.
- [x] Make password-reset/verification responses account-neutral where appropriate.

## P3 — UI/UX, accessibility and scalability
- [x] Fix customer Upcoming/History classification.
- [x] Replace destructive browser confirm flows with application dialogs/toasts where used.
- [x] Show useful customer/shop information in dashboards.
- [x] Add barber accept/decline/complete/no-show controls.
- [x] Fix INR/USD inconsistency and service validation/duplicate handling.
- [x] Replace unrestricted datetime booking with accessible dialog + server-generated slots.
- [x] Use salon timezone/canonical profile ID for customer date display and rescheduling.
- [x] Remove hardcoded ratings/reviews/about/hours/next-available claims.
- [x] Fix navbar anchors, mobile admin access, logout and notifications.
- [x] Separate marketing/auth/workspace chrome.
- [x] Fix logo aspect ratio and dead CTAs/placeholder links.
- [x] Add bounded server-side barber search/pagination instead of loading a fixed first batch.
- [x] Escape public regex search input.
- [x] Show directory load failures separately from empty search results.

## P4 — SEO, legal and maintenance
- [x] Fix sitemap/robots/noindex behavior and include only verified barber profiles.
- [x] Use fixed legal revision dates instead of changing them every request.
- [x] Remove inaccurate privacy/payment language and make support email configurable.
- [x] Standardize safe internal API errors.
- [x] Clean stale template CSS.
- [x] Validate production application URL/HTTPS configuration in code.
- [x] Add environment/configuration notes and database-index command.
- [x] Add code-level security regression tests.
- [x] Clean nested obsolete source archive before final packaging.

## Code-level checks completed
- [x] `npm test` — 14/14 regression checks passed.
- [x] `node --check` — all server-side `.js`/`.mjs` files under `src/lib`, `src/app/api`, and `scripts` passed syntax checking.
- [x] TypeScript parser pass over modified JSX/TSX found no syntax-class diagnostics; dependency/type resolution is deferred until install.
- [x] Package lock root dependencies match `package.json` and stale Auth.js/JWT package entries were removed.

## Post-code validation intentionally deferred
Run these in the target development/deployment environment after dependencies and MongoDB are available:

- [ ] `npm install`
- [ ] `npm run db:indexes` against the intended database after reviewing existing duplicates/overlaps.
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Browser/mobile responsive QA.
- [ ] End-to-end registration → verification → login → booking → reschedule/cancel → barber actions → admin actions.
- [ ] Google OAuth and email-provider delivery with real production credentials.

## Product capabilities intentionally outside this remediation pass
These are new product modules rather than fixes to the existing application and require separate product/infrastructure work: payments/refunds/payouts, POS, inventory, live multi-chair/walk-in queue, GPS/maps/distance discovery, real ratings/reviews, scheduled push/SMS/WhatsApp reminders, multi-location salons, QR check-in, and AI hairstyle preview.
