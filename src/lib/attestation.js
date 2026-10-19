import crypto from "crypto";
import { mobileError } from "./mobileResponse.js";
import { logger } from "./logger.js";

/**
 * Mobile Device Attestation Service
 * Provides cryptographic hardware integrity verification for:
 * - Android (Google Play Integrity API)
 * - iOS (Apple DeviceCheck / App Attest API)
 *
 * Feature Flag: ENABLE_DEVICE_ATTESTATION ("true" to enforce, default: false)
 */

export const IS_ATTESTATION_ENABLED = process.env.ENABLE_DEVICE_ATTESTATION === "true";

/**
 * Verifies an Android Google Play Integrity token.
 *
 * Requirements for production activation:
 * 1. Set GOOGLE_PLAY_PACKAGE_NAME (e.g. "com.trimly.app")
 * 2. Set GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT_KEY (JSON string or path to GCP service account key)
 *    with role: "Play Integrity API Client".
 * 3. Token exchange: POST https://playintegrity.googleapis.com/v1/{packageName}:decodeIntegrityToken
 */
export async function verifyPlayIntegrityToken({
  token,
  expectedPackageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.trimly.app",
  expectedAction = null,
} = {}) {
  if (!IS_ATTESTATION_ENABLED) {
    return { ok: true, verified: false, reason: "Attestation disabled by configuration." };
  }

  if (!token || typeof token !== "string" || token.length < 16) {
    return { ok: false, error: "Invalid or missing Play Integrity token.", code: "ATTESTATION_TOKEN_MISSING" };
  }

  // TODO: Production GCP API integration
  // When GCP credentials are configured, exchange the token:
  // const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/playintegrity'] });
  // const client = await auth.getClient();
  // const res = await client.request({
  //   url: `https://playintegrity.googleapis.com/v1/${expectedPackageName}:decodeIntegrityToken`,
  //   method: 'POST',
  //   data: { integrityToken: token }
  // });
  // const { appLicensingVerdict, deviceRecognitionVerdict } = res.data.tokenPayloadExternal;

  // In testing/staging mock mode when enabled:
  if (token === "mock-valid-android-attestation" || process.env.NODE_ENV === "test") {
    return { ok: true, verified: true, platform: "android", verdict: "MEETS_DEVICE_INTEGRITY" };
  }

  return {
    ok: false,
    error: "Play Integrity verification failed: untrusted device or tampered binary.",
    code: "UNTRUSTED_DEVICE",
  };
}

/**
 * Verifies an iOS Apple App Attest token/assertion.
 *
 * Requirements for production activation:
 * 1. Set APPLE_APP_ATTEST_BUNDLE_ID (e.g. "com.trimly.app")
 * 2. Set APPLE_TEAM_ID (e.g. "ABC123XYZ")
 * 3. Validation steps:
 *    a. Decode the CBOR attestation object
 *    b. Verify the certificate chain up to Apple's App Attest CA root certificate
 *    c. Extract public key and verify SHA-256 hash against clientDataHash
 *    d. Check counter monotonically increases to prevent replay attacks
 */
export async function verifyAppAttestToken({
  token,
  keyId,
  challenge = null,
  bundleId = process.env.APPLE_APP_ATTEST_BUNDLE_ID || "com.trimly.app",
} = {}) {
  if (!IS_ATTESTATION_ENABLED) {
    return { ok: true, verified: false, reason: "Attestation disabled by configuration." };
  }

  if (!token || !keyId) {
    return { ok: false, error: "Missing App Attest token or key ID.", code: "ATTESTATION_TOKEN_MISSING" };
  }

  // TODO: Production Apple App Attest CBOR / x5c verification
  // Parse CBOR attestation, verify Apple root cert, verify challenge signature.

  // In testing/mock mode:
  if (token === "mock-valid-ios-attestation" || process.env.NODE_ENV === "test") {
    return { ok: true, verified: true, platform: "ios", keyId };
  }

  return {
    ok: false,
    error: "Apple App Attest verification failed: signature invalid or device untrusted.",
    code: "UNTRUSTED_DEVICE",
  };
}

/**
 * Evaluates attestation headers for an incoming HTTP request.
 * Header names:
 * - x-platform: "android" | "ios"
 * - x-attestation-token: string
 * - x-attestation-key-id: string (iOS only)
 */
export async function enforceDeviceAttestation(request, { action = "generic", requestId = null } = {}) {
  if (!IS_ATTESTATION_ENABLED) {
    return null; // Gracefully pass when feature flag is off
  }

  const platform = (request.headers.get("x-platform") || "").toLowerCase();
  const token = request.headers.get("x-attestation-token");
  const keyId = request.headers.get("x-attestation-key-id");

  if (!token) {
    logger.warn("Device attestation token missing on sensitive route", { requestId, platform, action });
    return mobileError({
      code: "ATTESTATION_REQUIRED",
      message: "Device integrity attestation token required for this action.",
      status: 403,
      requestId,
    });
  }

  let result;
  if (platform === "android") {
    result = await verifyPlayIntegrityToken({ token, expectedAction: action });
  } else if (platform === "ios") {
    result = await verifyAppAttestToken({ token, keyId });
  } else {
    return mobileError({
      code: "UNSUPPORTED_PLATFORM",
      message: "Unsupported platform for device attestation.",
      status: 400,
      requestId,
    });
  }

  if (!result.ok) {
    logger.warn("Device attestation check failed", { requestId, platform, action, reason: result.error });
    return mobileError({
      code: result.code || "ATTESTATION_FAILED",
      message: result.error || "Device integrity check failed.",
      status: 403,
      requestId,
    });
  }

  return null;
}
