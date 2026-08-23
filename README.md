# Trimlly

Trimlly is a Next.js 15 barber/salon discovery and appointment-booking application with customer, barber, and administrator workspaces.

This source includes the security, booking-integrity, authentication, UI/UX and maintenance remediation described in `TASKS.md`.

## Requirements

- Node.js 20+
- MongoDB 6+
- npm

## Setup

1. Copy `.env.example` to `.env.local` and set the required values.
2. Install dependencies with `npm install`.
3. Review existing production data for duplicate users/barber profiles or overlapping active bookings.
4. Ensure MongoDB indexes with `npm run db:indexes`.
5. Start development with `npm run dev`.

The default database name is `trimly`. Set `MONGODB_DB` explicitly in production so APIs and authentication always use the same database.

## Required environment variables

- `MONGODB_URI`: MongoDB connection string.
- `MONGODB_DB`: database name; defaults to `trimly`.
- `NEXTAUTH_SECRET`: long random secret used to sign NextAuth tokens.
- `NEXTAUTH_URL`: canonical NextAuth URL.
- `NEXT_PUBLIC_APP_URL`: public application URL used for metadata and account links.

Production application URLs are required to be valid HTTPS URLs.

## Email and authentication configuration

New credential registrations require email verification. In production, configure:

- `RESEND_API_KEY`
- `EMAIL_FROM`

The same email provider is used for password reset. Development can surface generated verification/reset links when email delivery is not configured; production never exposes those tokens in API responses.

Google OAuth is enabled only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. Google accounts with a provider-verified email are recorded as email verified. If the same email already exists, its existing application role is preserved.

For backward compatibility, legacy credential accounts created before verification existed (no `emailVerified` field) can still authenticate. Newly created credential accounts are explicitly `emailVerified: false` and cannot authenticate until verification completes.

Optional `NEXT_PUBLIC_SUPPORT_EMAIL` controls whether a support mail link appears in the footer/privacy policy.

## Barber verification

New barber profiles start with `verificationStatus: "pending"`. Only profiles explicitly approved as `verified` are public/bookable or included in the sitemap. Legacy profiles without a verification status are treated as pending and require administrator approval.

Deactivating/demoting a barber or rejecting/deleting a verified profile cancels active reservations, releases reservation keys and notifies affected customers. Deactivating a customer similarly releases that customer's active reservations.

## Booking/security model

- Client requests do not control booking ownership or initial status.
- Customers can access only their own bookings.
- Barbers can access only bookings for their own barber profile.
- Administrator actions are explicitly role-protected and audited.
- Barber profiles are owner-controlled and require administrator verification before public booking.
- Booking status transitions are actor-specific and server-enforced.
- Concurrent state changes use the previously stored status as an atomic precondition.
- New bookings and reschedules pass through the same timezone-aware availability rules.
- Availability respects lead time, booking horizon, closed days, working hours, service duration and slot intervals.
- Active booking minutes are protected with unique MongoDB reservation indexes for both barber and customer to prevent overlapping reservations.
- Historical booking service name/ID, price and duration are snapshotted.
- User role/status changes increment a session version so stale JWT sessions become invalid.
- Custom state-changing APIs reject cross-site browser requests.

## Booking statuses

Primary path:

`pending -> confirmed -> completed`

Alternative terminal states include `cancelled`, `declined`, `no_show`, and `expired`. Customers, barbers and administrators have different allowed transitions.

## Public barber directory

`GET /api/barbers` uses bounded pagination and escaped server-side search. The response shape is:

```json
{
  "barbers": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 24,
    "totalPages": 1
  }
}
```

Only verified, non-deleted barber profiles are returned publicly.

## Validation commands

Code-level regression tests:

```bash
npm test
```

Before deployment, run:

```bash
npm install
npm run db:indexes
npm run lint
npm run build
```

The remediation package was code-checked without a dependency installation in the current sandbox, so lint/build/runtime QA must be executed in the target environment before deployment.

If an existing database contains duplicate user emails, duplicate barber ownership records, or overlapping active bookings, clean those records before `npm run db:indexes`; the unique indexes intentionally reject invalid historical data.

## Deployment notes

- Use HTTPS.
- Never commit or expose `.env*` files or secrets.
- Set `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to the real production HTTPS origin.
- Configure persistent MongoDB; rate limits, account tokens, distributed admin locks and audit records depend on it.
- Configure real email-provider credentials before enabling production credential registration/password reset.
- Review Privacy Policy and Terms with legal counsel before production launch.
- Run the post-code checks listed in `TASKS.md` before public deployment.
