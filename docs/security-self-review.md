# Trimly Mobile Backend — Security Self-Review
**Evaluation against OWASP API Security Top 10 (2023) & OWASP MASVS (Mobile Application Security Verification Standard)**

---

## Part 1: OWASP API Security Top 10 (2023) Evaluation

### API1:2023 — Broken Object Level Authorization (BOLA)
- **Status:** **PASS**
- **Assessment:**
  - All endpoints accessing specific resources (`/bookings/{id}`, `/notifications`, `/favorites/{barberId}`, `/auth/sessions/{id}`) perform server-side object ownership verification against the authenticated user ID extracted from the verified JWT.
  - Cross-user mutation or access attempts return `404 Not Found` or `403 Forbidden` without leaking resource existence or metadata.
  - Verified by tests in `tests/mobile-security-matrix.test.mjs` (Subtest 4).

### API2:2023 — Broken Authentication
- **Status:** **PASS**
- **Assessment:**
  - Dual authentication architecture strictly isolates cookie-based web sessions from mobile Bearer token auth.
  - Mobile routes ignore cookies entirely, preventing CSRF.
  - Short-lived JWTs (15 min) with cryptographic signature validation (`HS256` / `EdDSA`).
  - Refresh tokens are opaque random 256-bit strings stored only as SHA-256 hashes.
  - Automatic token rotation on every use with **Token Family Reuse Detection**: if a previously used refresh token is presented (replay attack), the entire family of sessions is immediately revoked, and an audit log event is dispatched.
  - Stale `sessionVersion` invalidates all issued JWTs upon password reset or administrative role changes.

### API3:2023 — Broken Object Property Level Authorization
- **Status:** **PASS**
- **Assessment:**
  - Input validation via zod schemas strips unprivileged fields (e.g. `role`, `verificationStatus`, `active`, `sessionVersion`).
  - Response serializers (`serializeBarber`, `serializeBooking`, `serializeUserProfile`) use explicit allow-lists. Password hashes, token hashes, reservation keys, and administrative flags are never included in API responses.

### API4:2023 — Unrestricted Resource Consumption
- **Status:** **PASS**
- **Assessment:**
  - Multi-tier rate limiting implemented via atomic MongoDB upserts across IP, user ID, and device ID.
  - Configurable limits applied to:
    - Login: 20/15m (IP), 10/15m (email), 15/15m (device).
    - Registration: 5/15m.
    - Bookings: 15/15m (user), 30/15m (IP).
    - Media uploads: 20/15m.
    - Reviews: 5/10m.
    - Search: 120/1m.
  - Rate-limited responses return `429 Too Many Requests` with RFC 7231 `Retry-After: <seconds>` headers.
  - Bounded pagination limits (`limit <= 50`) prevent memory exhaustion.

### API5:2023 — Broken Function Level Authorization
- **Status:** **PASS**
- **Assessment:**
  - Strict role-based access control (RBAC) enforced via `getMobileSession(request, allowedRoles)`.
  - Customer attempts to access barber-only self-management endpoints (`/barber/profile`) return `403 Forbidden`.
  - ID document inspection (`/media/private/*`) is restricted to administrative roles or short-lived cryptographic download tokens, with audit logs on each access.

### API6:2023 — Unrestricted Access to Sensitive Business Flows
- **Status:** **PASS**
- **Assessment:**
  - Appointment creation (`POST /bookings`) enforces an `Idempotency-Key` header with a 24-hour SHA-256 payload replay cache, preventing duplicate charges or bookings.
  - Re-submitting an idempotency key with a modified payload returns `422 IDEMPOTENCY_MISMATCH`.
  - Atomic double-booking conflict detection (`hasBookingConflict`) prevents race conditions for overlapping appointment slots.

### API7:2023 — Server-Side Request Forgery (SSRF)
- **Status:** **PASS**
- **Assessment:**
  - No user-supplied URLs are fetched by the backend.
  - Social login identity verification (Google, Apple) fetches JWKS exclusively from hardcoded, official HTTPS endpoints (`https://appleid.apple.com/auth/keys`, `https://oauth2.googleapis.com/tokeninfo`).
  - Webhooks and proxy endpoints are absent or strictly restricted to known internal origins.

### API8:2023 — Security Misconfiguration
- **Status:** **PASS**
- **Assessment:**
  - Comprehensive security headers injected in `next.config.mjs`: Content Security Policy (`default-src 'self'`), `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
  - Auth endpoints return `Cache-Control: no-store, max-age=0`.
  - CORS: Mobile native requests require no CORS; wildcard origins (`*`) are disallowed.

### API9:2023 — Improper Inventory Management
- **Status:** **PASS**
- **Assessment:**
  - Explicit versioned namespace `/api/mobile/v1/*`.
  - Automated version gatekeeper (`enforceAppVersion`) compares client `X-App-Version` against `minSupportedAppVersion`, returning `426 UPGRADE_REQUIRED` for outdated clients.
  - Complete OpenAPI 3.1 specification maintained and committed at `docs/openapi/mobile-v1.yaml`.

### API10:2023 — Unsafe Consumption of APIs
- **Status:** **PASS**
- **Assessment:**
  - Cloud media pipeline validates uploaded binaries using magic-byte inspection (JPEG, PNG, WebP) and strips EXIF/GPS metadata before publishing.
  - Have I Been Pwned API calls use k-anonymity (5-character SHA-1 prefix) with 2-second timeouts and safe fallback if unreachable.

---

## Part 2: OWASP MASVS (Mobile App Security) Server-Side Implications

### MASVS-AUTH: Authentication & Session Management
- [x] Passwords hashed with bcrypt (work factor 12).
- [x] Breached password check enforced via Have I Been Pwned k-anonymity API.
- [x] Mobile sessions stored with client metadata (platform, deviceId, IP, appVersion) with low PII footprint.
- [x] Password changes / resets bump `sessionVersion` and invalidate all mobile sessions across all devices.

### MASVS-NETWORK: Network Communications & Privacy
- [x] Server-side TLS 1.3 enforced via HSTS headers with preload.
- [x] Client IP extraction supports configurable reverse proxy hops (`TRUSTED_PROXY_HOPS`), preventing IP spoofing behind CDNs.
- [x] Push notification payloads are sanitized to contain **zero PII** (no names, emails, phones, or addresses; opaque identifiers only).

### MASVS-STORAGE: Data Storage & Privacy
- [x] Base64 image payloads eradicated from MongoDB documents.
- [x] ID documents encrypted at rest using AES-256-GCM field-level encryption with key management.
- [x] Account lifecycle supports complete account deletion (`DELETE /account`), booking cascade, and PII anonymization in compliance with DPDP and GDPR.

---

## Part 3: Residual Risks & Ownership

| Residual Risk | Severity | Current Mitigation | Recommended Phase 2/3 Action | Owner |
| :--- | :--- | :--- | :--- | :--- |
| **GCP / Apple Production Keys** | Low (Deferred) | Architecture and test mocks ready; feature flag off | Obtain Apple Developer Team ID and GCP Service Account for production attestation | DevOps / Lead |
| **S3 / R2 Bucket Provisioning** | Low (Config) | Local filesystem and S3 adapter ready | Provision AWS S3 or Cloudflare R2 bucket and set bucket credentials | DevOps |
| **FCM / APNs Production Certificates** | Low (Config) | Provider interface and fallback logging ready | Upload Firebase service account JSON and Apple APNs auth key | Mobile Lead |
| **SMS OTP Verification** | Informational | Phone number stored as optional user attribute; email OTP active | Add Twilio/AWS SNS SMS provider if phone OTP is mandated in Phase 2 | Product / Backend |
