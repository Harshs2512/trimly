/**
 * Environment variable validation and startup security verification.
 * Fails fast in production if security-critical secrets are missing or weak.
 */

export function validateEnvironment() {
  const isProd = process.env.NODE_ENV === "production";
  const errors = [];

  // Required database connection
  if (!process.env.MONGODB_URI) {
    errors.push("MONGODB_URI is required.");
  }

  // NextAuth secret validation
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    if (isProd) errors.push("NEXTAUTH_SECRET is required in production.");
  } else if (nextAuthSecret.length < 32 && isProd) {
    errors.push("NEXTAUTH_SECRET must be at least 32 characters long in production.");
  }

  // Mobile JWT signing secret validation
  const mobileJwtSecret = process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!mobileJwtSecret && isProd) {
    errors.push("MOBILE_JWT_SECRET (or NEXTAUTH_SECRET) is required for mobile bearer authentication.");
  } else if (mobileJwtSecret && mobileJwtSecret.length < 32 && isProd) {
    errors.push("MOBILE_JWT_SECRET must be at least 32 characters long in production.");
  }

  // Field-level AES-256-GCM encryption key (32 bytes = 64 hex chars)
  const fieldKey = process.env.FIELD_ENCRYPTION_KEY;
  if (fieldKey && !/^[0-9a-fA-F]{64}$/.test(fieldKey)) {
    errors.push("FIELD_ENCRYPTION_KEY must be a 64-character hex string (256-bit AES key).");
  }

  if (errors.length > 0) {
    const message = `[FATAL] Environment Configuration Errors:\n  - ${errors.join("\n  - ")}`;
    if (isProd) {
      throw new Error(message);
    } else {
      console.warn(`[WARN] Environment Configuration Warnings:\n  - ${errors.join("\n  - ")}`);
    }
  }

  return true;
}

export function getMobileJwtSecret() {
  const secret = process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MOBILE_JWT_SECRET is required in production.");
    }
    // Fallback development-only deterministic key
    return "trimly-development-fallback-mobile-jwt-secret-min-32-chars-long";
  }
  return secret;
}

export function getFieldEncryptionKey() {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key) {
    // Development fallback key (64 hex characters)
    return "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  }
  return key;
}

// Run validation once on module evaluation
try {
  validateEnvironment();
} catch (err) {
  if (process.env.NODE_ENV === "production") {
    console.error(err.message);
    process.exit(1);
  }
}
