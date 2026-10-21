import crypto from "crypto";
import { normalizeEmail } from "./security.js";

let googleJwksCache = null;
let googleJwksExpiresAt = 0;

let appleJwksCache = null;
let appleJwksExpiresAt = 0;

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64");
}

function parseJwtHeaderAndPayload(jwtString) {
  if (!jwtString || typeof jwtString !== "string") return null;
  const parts = jwtString.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]).toString("utf8"));
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString("utf8"));
    const signature = base64UrlDecode(parts[2]);
    const signedData = Buffer.from(`${parts[0]}.${parts[1]}`);
    return { header, payload, signature, signedData };
  } catch {
    return null;
  }
}

/**
 * Fetches Apple's public JWKS with 6-hour memory caching.
 */
async function getAppleJwks() {
  const now = Date.now();
  if (appleJwksCache && appleJwksExpiresAt > now) {
    return appleJwksCache;
  }

  const res = await fetch("https://appleid.apple.com/auth/keys", {
    headers: { "User-Agent": "Trimly-Backend/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Apple JWKS: ${res.status}`);
  }

  const data = await res.json();
  appleJwksCache = data.keys || [];
  appleJwksExpiresAt = now + 6 * 60 * 60 * 1000;
  return appleJwksCache;
}

/**
 * Verifies an Apple Identity Token natively using Node.js crypto and Apple JWKS.
 */
export async function verifyAppleIdToken(idToken, { rawNonce = null } = {}) {
  const parsed = parseJwtHeaderAndPayload(idToken);
  if (!parsed) {
    return { valid: false, error: "Invalid Apple ID token format" };
  }

  const { header, payload, signature, signedData } = parsed;

  // 1. Verify algorithm
  if (header.alg !== "RS256") {
    return { valid: false, error: "Unsupported Apple JWT algorithm" };
  }

  // 2. Verify issuer and expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== "https://appleid.apple.com") {
    return { valid: false, error: "Invalid Apple token issuer" };
  }
  if (!payload.exp || payload.exp < now) {
    return { valid: false, error: "Apple ID token has expired" };
  }

  // 3. Verify audience against configured bundle IDs
  const allowedAudiences = [
    process.env.APPLE_BUNDLE_ID || "app.trimly.ios",
    process.env.APPLE_SERVICE_ID || "app.trimly.web.auth",
  ].filter(Boolean);

  if (!allowedAudiences.includes(payload.aud)) {
    return { valid: false, error: `Invalid Apple token audience: ${payload.aud}` };
  }

  // 4. Verify nonce if supplied
  if (rawNonce) {
    const expectedHash = crypto.createHash("sha256").update(rawNonce).digest("hex");
    if (payload.nonce && payload.nonce !== expectedHash && payload.nonce !== rawNonce) {
      return { valid: false, error: "Apple token nonce mismatch" };
    }
  }

  // 5. Verify cryptographic RSA signature using Apple public key
  try {
    const keys = await getAppleJwks();
    const matchingKey = keys.find((k) => k.kid === header.kid);
    if (!matchingKey) {
      return { valid: false, error: "No matching Apple public key found for kid" };
    }

    const publicKey = crypto.createPublicKey({ key: matchingKey, format: "jwk" });
    const isSignatureValid = crypto.verify("sha256", signedData, publicKey, signature);
    if (!isSignatureValid) {
      return { valid: false, error: "Apple token signature verification failed" };
    }
  } catch (err) {
    console.error("[apple-auth] Signature verification error:", err);
    return { valid: false, error: "Cryptographic verification failed" };
  }

  const email = payload.email ? normalizeEmail(payload.email) : null;
  const isPrivateRelay = email ? email.endsWith("@privaterelay.appleid.com") : false;

  return {
    valid: true,
    user: {
      sub: payload.sub,
      email,
      emailVerified: payload.email_verified === "true" || payload.email_verified === true,
      isPrivateRelay,
    },
  };
}

/**
 * Verifies a Google ID token from Native Android / iOS SDKs.
 * Uses Google tokeninfo endpoint + JWKS audience and issuer validation.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    return { valid: false, error: "Missing Google ID token" };
  }

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      return { valid: false, error: "Google ID token validation failed at provider" };
    }

    const payload = await res.json();
    const now = Math.floor(Date.now() / 1000);

    // 1. Verify issuer
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (!validIssuers.includes(payload.iss)) {
      return { valid: false, error: "Invalid Google token issuer" };
    }

    // 2. Verify expiration
    if (Number(payload.exp) < now) {
      return { valid: false, error: "Google ID token has expired" };
    }

    // 3. Verify audience
    const configuredClientIds = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);

    // If client IDs are configured, enforce strict matching
    if (configuredClientIds.length > 0 && !configuredClientIds.includes(payload.aud)) {
      return { valid: false, error: `Google ID token audience '${payload.aud}' does not match any configured client IDs.` };
    }

    // 4. Verify email verified
    const isVerified = payload.email_verified === "true" || payload.email_verified === true;
    if (!isVerified) {
      return { valid: false, error: "Google email address is not verified" };
    }

    return {
      valid: true,
      user: {
        sub: payload.sub,
        email: normalizeEmail(payload.email),
        name: payload.name || payload.email.split("@")[0],
        picture: payload.picture || null,
        emailVerified: true,
      },
    };
  } catch (err) {
    console.error("[google-auth] Token verification error:", err);
    return { valid: false, error: "Failed to communicate with Google authentication service" };
  }
}

/**
 * Handles account lookup, linking, and creation for verified social identities.
 */
export async function processSocialLogin(db, {
  provider,
  verifiedUser,
  deviceId,
  platform,
  appVersion,
  ip,
  userAgent,
  createMobileSession,
}) {
  const subField = provider === "google" ? "googleSub" : "appleSub";

  // 1. Try finding user by social subject id
  let user = await db.collection("users").findOne({ [subField]: verifiedUser.sub });

  if (user) {
    if (user.active === false) {
      return {
        error: {
          code: "ACCOUNT_DEACTIVATED",
          message: "This account has been deactivated. Please contact support.",
          status: 403,
        },
      };
    }
  } else {
    // 2. Try finding user by verified email
    if (verifiedUser.email) {
      user = await db.collection("users").findOne({ email: verifiedUser.email });
      if (user) {
        if (user.active === false) {
          return {
            error: {
              code: "ACCOUNT_DEACTIVATED",
              message: "This account has been deactivated. Please contact support.",
              status: 403,
            },
          };
        }
        // Link social provider sub to existing user (keeping current role unchanged)
        await db.collection("users").updateOne(
          { _id: user._id },
          {
            $set: {
              [subField]: verifiedUser.sub,
              emailVerified: true,
              updatedAt: new Date(),
            },
          }
        );
        user[subField] = verifiedUser.sub;
        user.emailVerified = true;
      }
    }

    // 3. New account registration via social login
    if (!user) {
      const newUser = {
        name: verifiedUser.name || (provider === "apple" ? "Apple User" : "Google User"),
        email: verifiedUser.email || `${provider}_${verifiedUser.sub}@privaterelay.trimly.local`,
        role: "user",
        active: true,
        emailVerified: true,
        [subField]: verifiedUser.sub,
        sessionVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const res = await db.collection("users").insertOne(newUser);
      newUser._id = res.insertedId;
      user = newUser;
    }
  }

  // Create mobile bearer session
  const sessionResult = await createMobileSession(db, {
    userId: user._id.toString(),
    deviceId,
    platform: platform || "unknown",
    appVersion: appVersion || "1.0.0",
    userAgent: userAgent || "",
    ip,
    sessionVersion: user.sessionVersion || 1,
    role: user.role || "user",
  });

  return {
    user,
    sessionResult,
  };
}
