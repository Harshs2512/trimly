# Trimly Backend Hardening & Mobile API Gateway — Architecture & Change Log

## 1. Executive Summary

Phase 1 establishes a hardened, enterprise-grade backend gateway tailored for native Android and iOS clients under the `/api/mobile/v1/*` namespace while maintaining **100% backward compatibility** with the existing Trimly Next.js web application and NextAuth cookie sessions.

Key achievements:
- **Zero Web Regressions**: Existing cookie-based web routes and admin dashboards remain unaltered and functional.
- **Dual Auth Architecture**: Cookie sessions for web, short-lived signed JWTs + opaque refresh token families with reuse detection for mobile.
- **Direct Domain Logic Reuse**: Single source of truth in `src/lib/*` for bookings, availability, reviews, notifications, and security.
- **Zero Third-Party Vulnerabilities Added**: All cryptographic routines (EdDSA/RSA/AES-256-GCM/SHA-256), image sanitation, and token handling leverage Node.js standard runtime libraries (`node:crypto`).

---

## 2. Inventory of Changes

### New Modules (`src/lib/*`)
1. **`mobileAuth.js`**:
   - Access token issuance (`sub`, `role`, `sid`, `sv`, `iat`, `exp`, `iss`, `aud`).
   - Opaque refresh token hashing (SHA-256) and atomic rotation with token family reuse detection.
   - Have I Been Pwned (HIBP) k-anonymity breached-password check.
   - `getMobileSession(request, roles)` helper strictly enforcing Bearer headers and rejecting browser cookies.
2. **`mobileResponse.js`**:
   - Standard response envelopes (`mobileSuccess`, `mobileError`).
   - Semantic versioning comparison and minimum app version gatekeeper (`enforceAppVersion` -> `426 UPGRADE_REQUIRED`).
   - Minimal allow-list response serializers (`serializeBarber`, `serializeBooking`, `serializeReview`, `serializeNotification`, `serializeUserProfile`).
   - ETag generator and validator for HTTP caching.
   - Trusted proxy-aware client IP extraction supporting `TRUSTED_PROXY_HOPS`.
3. **`socialAuth.js`**:
   - Native Google ID token verification against Google's public tokeninfo/JWKS endpoints.
   - Native Apple identity token signature verification against Apple's live JWKS RSA public keys.
   - Safe social account linking bound to provider `sub` and verified email without privilege escalation.
4. **`storage.js`**:
   - S3-compatible object storage provider abstraction.
   - AES-256-GCM field encryption/decryption for sensitive documents.
   - Magic byte inspection (JPEG, PNG, WebP) and EXIF/GPS metadata stripping for image privacy.
   - Time-limited signed URL generation for private ID documents.
5. **`push.js`**:
   - Push notification fan-out provider (FCM / APNs).
   - Strict privacy payload formatting (zero names, phone numbers, or addresses in push messages).
   - Automated appointment reminder job triggers (24h and 1h intervals).
6. **`geo.js`**:
   - Haversine great-circle distance computation (`calculateDistanceKm`).
   - Geospatial coordinate validation and city geocoding fallback.
7. **`logger.js`**:
   - Structured single-line JSON logging with `requestId`.
   - Automatic recursive redaction of credentials, tokens, secrets, hashes, and masked PII (emails/phones).
8. **`attestation.js`**:
   - Hardware integrity attestation hooks for Google Play Integrity and Apple App Attest (feature-flagged).

### Enhanced Web Modules
- **`accountLifecycle.js`**: Integrated `deleteUserAccount` with last-admin deletion block, active booking cancellation, mobile session purge, and PII anonymization.
- **`booking.js`**: Extracted reusable domain functions (`getBarberAvailability`, `updateBookingStatus`).
- **`reviews.js`**: Extracted reusable domain function `createReview`.
- **`notifications.js`**: Upgraded `createNotification` to fan-out to push notification devices.
- **`rateLimit.js`**: Added `enforceMobileRateLimit` returning `429` with `Retry-After` seconds header.
- **`api.js`**: Enhanced `getClientIp` with configurable `TRUSTED_PROXY_HOPS`.
- **`next.config.mjs`**: Hardened security response headers (CSP, HSTS preload, Permissions-Policy, Referrer-Policy, Cache-Control).

---

## 3. New Environment Variables (Names Only)

Add the following variables to `.env.local` / production environment:

| Variable Name | Required | Default / Description |
| :--- | :--- | :--- |
| `MOBILE_JWT_SECRET` | **Yes** | Signing key for mobile access tokens (>= 32 chars). |
| `FIELD_ENCRYPTION_KEY` | **Yes** | 32-byte hex key for AES-256-GCM encryption. |
| `TRUSTED_PROXY_HOPS` | No | Number of reverse proxy hops (default: `1`). |
| `MIN_APP_VERSION_IOS` | No | Minimum supported iOS app version (default: `1.0.0`). |
| `MIN_APP_VERSION_ANDROID` | No | Minimum supported Android app version (default: `1.0.0`). |
| `GOOGLE_ANDROID_CLIENT_ID` | No | Google OAuth Android client ID. |
| `GOOGLE_IOS_CLIENT_ID` | No | Google OAuth iOS client ID. |
| `APPLE_BUNDLE_ID` | No | Apple App Bundle Identifier (e.g. `com.trimly.app`). |
| `APPLE_APP_ATTEST_TEAM_ID` | No | Apple Developer Team ID. |
| `ENABLE_DEVICE_ATTESTATION`| No | Enable hardware attestation (default: `false`). |
| `S3_BUCKET_NAME` | No | S3-compatible media bucket name. |
| `S3_REGION` | No | Cloud storage region (e.g. `us-east-1`). |
| `S3_ACCESS_KEY_ID` | No | Storage access key ID. |
| `S3_SECRET_ACCESS_KEY` | No | Storage secret access key. |
| `S3_ENDPOINT` | No | Custom S3 endpoint (R2, MinIO, etc.). |
| `FCM_SERVICE_ACCOUNT_KEY` | No | Firebase Cloud Messaging service account credentials. |
| `REMINDER_JOB_SECRET` | No | Secret bearer key protecting `/jobs/reminders`. |

---

## 4. Database Collections & Indexes

New collections added in `src/lib/indexes.js` and `scripts/ensure-indexes.mjs`:

1. **`mobile_sessions`**:
   - `{ userId: 1, isRevoked: 1 }`
   - `{ refreshHash: 1 }` (unique, sparse)
   - `{ familyId: 1 }`
   - `{ expiresAt: 1 }` (TTL index)
2. **`devices`**:
   - `{ userId: 1, deviceId: 1 }` (unique)
   - `{ pushToken: 1 }` (unique, sparse)
   - `{ lastSeenAt: 1 }`
3. **`notification_preferences`**:
   - `{ userId: 1 }` (unique)
4. **`favorites`**:
   - `{ userId: 1, barberId: 1 }` (unique)
   - `{ userId: 1, createdAt: -1 }`
5. **`consents`**:
   - `{ userId: 1, policyVersion: 1 }`
6. **`users` (new indexes)**:
   - `{ googleSub: 1 }` (unique, sparse)
   - `{ appleSub: 1 }` (unique, sparse)
7. **`barbers` (new indexes)**:
   - `{ location: "2dsphere" }` (geospatial index)

---

## 5. Migration Run-Book

### Step 1: Index Creation
Apply all indexes across existing and new collections:
```bash
npm run db:indexes
```

### Step 2: Media Migration (Base64 -> Object Storage)
Migrate legacy base64 images into cloud storage.
- Dry-run verification (safe, zero writes):
  ```bash
  node scripts/migrate-media.mjs
  ```
- Live migration (after dry-run approval):
  ```bash
  node scripts/migrate-media.mjs --live
  ```
- Rollback: The legacy fields (`workPhotos`, `shopExteriorImage`, `idDocumentImage`) remain preserved in MongoDB until manually purged after validation.

### Step 3: Geospatial Backfill
Geocode existing verified barbers and populate `location: { type: "Point", coordinates: [lng, lat] }`:
- Dry-run verification:
  ```bash
  node scripts/backfill-geo.mjs
  ```
- Live execution:
  ```bash
  node scripts/backfill-geo.mjs --live
  ```

---

## 6. Deployment Checklist

- [ ] Run `npm run check` in CI (tests, lint, build).
- [ ] Configure `MOBILE_JWT_SECRET` and `FIELD_ENCRYPTION_KEY` in production secrets manager.
- [ ] Ensure `TRUSTED_PROXY_HOPS` matches infrastructure topology (e.g. `2` for Cloudflare -> ALB).
- [ ] Run index script: `node scripts/ensure-indexes.mjs`.
- [ ] Execute `scripts/migrate-media.mjs --live` and verify sample media URLs.
- [ ] Verify health endpoints `/healthz` (200 OK) and `/readyz` (200 Ready) through load balancer health checks.
- [ ] Configure scheduled platform cron job for `POST /api/mobile/v1/jobs/reminders` with `x-job-secret`.
- [ ] Rotate all legacy secrets that were exposed in developer shared archives.

---

## 7. Threat Model Delta (OWASP API & MASVS)

| Threat Category | Potential Risk | Mitigation in Phase 1 |
| :--- | :--- | :--- |
| **API1: BOLA / IDOR** | Customer modifying another user's booking | Strict ownership checks (`existing.userId === user.id`) before any status mutation; returns 404/403. |
| **API2: Broken Auth** | Token theft, refresh replay attack | Short-lived JWTs (15 min), SHA-256 hashed refresh tokens, atomic rotation, token family revocation upon reuse. |
| **API3: Broken Object Property Level Auth** | Mass-assignment of `role` or `verificationStatus` | Strict zod input schemas stripping unprivileged fields; role derived exclusively from session. |
| **API4: Unrestricted Resource Consumption** | DoS via booking spam or brute-force logins | Multi-tier rate limiting (IP, email, device ID), 429 with `Retry-After` headers, burst attack audit logs. |
| **API5: Broken Function Level Auth** | Customers invoking barber/admin endpoints | Role authorization checks (`getMobileSession(request, ["barber"])`) failing closed. |
| **API6: Unrestricted Access to Sensitive Business Flows** | Double-booking race condition | Idempotency keys (`Idempotency-Key` header with SHA-256 payload caching) and atomic slot reservation conflict checks. |
| **API7: Server Side Request Forgery (SSRF)** | Malicious social token verification | Live JWKS URLs hardcoded to Google and Apple official endpoints; no user-supplied URLs fetched. |
| **API8: Security Misconfiguration** | Verbose error leaks, missing security headers | Standard error envelope hiding internal traces; strict CSP, HSTS preload, Permissions-Policy headers. |
| **API9: Improper Inventory Management** | Stale API versions, unmaintained endpoints | Clear `/api/mobile/v1` namespace; version enforcement gatekeeper (`426 UPGRADE_REQUIRED`). |
| **API10: Unsafe Consumption of APIs** | Malicious file uploads in portfolio | Direct magic-byte file sniffing, EXIF/GPS stripping, and role-gated private document endpoints. |
| **MASVS-STORAGE** | Sensitive data leaked in push notifications | Push payloads contain zero PII; opaque identifiers only. |
