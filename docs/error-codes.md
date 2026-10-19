# Trimly Mobile API — Error Code Specification

All mobile endpoints under `/api/mobile/v1/*` strictly adhere to the standard error response envelope:

```json
{
  "error": {
    "code": "SLOT_TAKEN",
    "message": "The selected appointment slot is no longer available.",
    "details": {},
    "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

Internal exception stack traces and sensitive database error strings are never leaked to mobile clients.

---

## Error Codes Matrix

| HTTP Status | Error Code | Description / Client Handling |
| :--- | :--- | :--- |
| **400** | `INVALID_JSON` | Malformed JSON in request body. |
| **400** | `VALIDATION_ERROR` | Request payload failed zod schema validation. Detailed field issues in `details.fieldErrors`. |
| **400** | `INVALID_ID` | Resource ID in URL path is not a valid 24-character hexadecimal ObjectId. |
| **400** | `INVALID_CREDENTIALS` | Generic error on login failure (defends against email enumeration). |
| **400** | `PASSWORD_BREACHED` | Password appeared in known public data breach (Have I Been Pwned k-anonymity check). |
| **400** | `RESCHEDULE_TIME_REQUIRED` | Rescheduling a booking requires providing a new target `timeSlot`. |
| **400** | `INVALID_IMAGE_TYPE` | Uploaded file magic bytes do not match allowed image formats (JPEG, PNG, WebP). |
| **400** | `FILE_TOO_LARGE` | Uploaded media exceeds maximum size limit (5 MB). |
| **401** | `UNAUTHENTICATED` | Missing or malformed `Authorization: Bearer <token>` header. |
| **401** | `TOKEN_EXPIRED` | Short-lived access token has expired (client should call `/auth/refresh`). |
| **401** | `TOKEN_REVOKED` | Token revoked due to logout, reuse detection, or stale `sessionVersion`. Re-login required. |
| **401** | `INVALID_TOKEN` | Bearer token signature invalid, corrupted, or unsupported algorithm. |
| **401** | `ACCOUNT_INACTIVE` | Account does not exist, has been deactivated, or email is unverified. |
| **403** | `FORBIDDEN` | Authenticated user lacks the required role for this action (e.g., customer attempting barber action). |
| **403** | `ACCOUNT_DEACTIVATED` | User account has been deactivated by administrator. |
| **403** | `EMAIL_NOT_VERIFIED` | Email address has not been verified yet. |
| **403** | `CANNOT_DELETE_LAST_ADMIN` | Account lifecycle safeguard: system requires at least one active administrator. |
| **403** | `ATTESTATION_REQUIRED` | Hardware attestation token required when `ENABLE_DEVICE_ATTESTATION=true`. |
| **403** | `ATTESTATION_FAILED` | Google Play Integrity or Apple App Attest verification failed (untrusted device or forged token). |
| **404** | `BARBER_NOT_FOUND` | Barber profile does not exist or has not been verified by an administrator. |
| **404** | `BOOKING_NOT_FOUND` | Booking ID not found or does not belong to the authenticated user (IDOR prevention). |
| **404** | `SESSION_NOT_FOUND` | Mobile session record not found or already revoked. |
| **409** | `EMAIL_EXISTS` | An account with the specified email address is already registered. |
| **409** | `SLOT_TAKEN` | Appointment time slot was concurrently reserved by another customer. |
| **409** | `USER_CONFLICT` | Customer already has an overlapping active appointment at this time. |
| **409** | `INVALID_TRANSITION` | Disallowed booking status transition (e.g. attempting to complete a cancelled booking). |
| **409** | `CANCEL_AFTER_START` | Customer cannot cancel an appointment after its scheduled start time. |
| **409** | `COMPLETE_BEFORE_END` | Barber cannot mark an appointment complete before its scheduled service duration has elapsed. |
| **409** | `NO_SHOW_FUTURE` | Barber cannot flag a future appointment as a no-show before appointment time. |
| **409** | `REVIEW_EXISTS` | A review has already been submitted for this booking. |
| **422** | `IDEMPOTENCY_MISMATCH` | `Idempotency-Key` was re-submitted with a different request payload. |
| **426** | `UPGRADE_REQUIRED` | Mobile client version is below `minSupportedAppVersion`. Prompt user to update app. |
| **429** | `RATE_LIMIT_EXCEEDED` | Request quota exceeded. Header `Retry-After: <seconds>` indicates wait duration. |
| **500** | `INTERNAL_ERROR` | Unexpected server failure. Request logged with `requestId`. |
| **503** | `MAINTENANCE_MODE` | API temporarily unavailable due to scheduled maintenance. |
| **503** | `SERVICE_UNAVAILABLE` | External dependency unavailable (e.g. database ping failed on `/readyz`). |
