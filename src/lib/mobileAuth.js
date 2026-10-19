import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb.js";
import { hashToken, normalizeEmail, randomToken } from "./security.js";
import { getMobileJwtSecret } from "./env.js";
import { writeAuditLog } from "./audit.js";

const JWT_ISSUER = "trimly-api";
const JWT_AUDIENCE = "trimly-mobile";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_DAYS = 30; // 30 days idle timeout
const ABSOLUTE_SESSION_MAX_DAYS = 60; // 60 days hard max lifetime

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Signs a short-lived mobile JWT access token using HMAC-SHA256 (HS256).
 */
export function signAccessToken({ userId, role, sessionId, sessionVersion }) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(userId),
    role: role || "user",
    sid: String(sessionId),
    sv: Number(sessionVersion || 0),
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
  };

  const secret = getMobileJwtSecret();
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}

/**
 * Cryptographically verifies and decodes a mobile JWT access token.
 * Defends against 'alg: none' and key confusion attacks by strictly enforcing HS256.
 */
export function verifyAccessToken(tokenString) {
  if (!tokenString || typeof tokenString !== "string") {
    return { valid: false, error: "Missing or invalid token format" };
  }

  const parts = tokenString.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed JWT token" };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return { valid: false, error: "Failed to decode JWT segments" };
  }

  // Reject alg: none or non-HS256 algorithms
  if (header?.alg !== "HS256") {
    return { valid: false, error: "Unsupported JWT algorithm" };
  }

  const secret = getMobileJwtSecret();
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Constant-time signature comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return { valid: false, error: "Invalid token signature" };
  }

  // Audience and issuer check
  if (payload.iss !== JWT_ISSUER || payload.aud !== JWT_AUDIENCE) {
    return { valid: false, error: "Invalid token issuer or audience" };
  }

  // Expiration check
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    return { valid: false, error: "Token has expired", expired: true };
  }

  return { valid: true, payload };
}

/**
 * Creates a new mobile session and token family in MongoDB.
 */
export async function createMobileSession(db, {
  userId,
  deviceId,
  platform = "unknown",
  appVersion = "1.0.0",
  userAgent = "",
  ip = "unknown",
  sessionVersion = 0,
  role = "user",
}) {
  const refreshToken = randomToken(32); // 256 bits of entropy
  const refreshHash = hashToken(refreshToken);
  const familyId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const maxLifetime = new Date(now.getTime() + ABSOLUTE_SESSION_MAX_DAYS * 24 * 60 * 60 * 1000);

  const sessionDoc = {
    userId: String(userId),
    deviceId: String(deviceId || crypto.randomUUID()),
    familyId,
    refreshHash,
    prevRefreshHash: null,
    isRevoked: false,
    platform: String(platform || "unknown").toLowerCase(),
    appVersion: String(appVersion || "1.0.0"),
    userAgent: String(userAgent || "").slice(0, 300),
    ip: String(ip || "unknown"),
    createdAt: now,
    lastUsedAt: now,
    expiresAt,
    maxLifetime,
  };

  const insertResult = await db.collection("mobile_sessions").insertOne(sessionDoc);
  const sessionId = insertResult.insertedId.toString();

  const accessToken = signAccessToken({
    userId,
    role,
    sessionId,
    sessionVersion,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    sessionId,
    familyId,
  };
}

/**
 * Rotates a refresh token on every use with Token Family Reuse Detection.
 * If an already-rotated or revoked token is reused, all sessions in that family are immediately revoked.
 */
export async function rotateMobileSession(db, { refreshToken, deviceId = null, ip = "unknown" }) {
  if (!refreshToken) {
    return { ok: false, status: 400, code: "MISSING_TOKEN", error: "Refresh token is required" };
  }

  const incomingHash = hashToken(refreshToken);
  const sessionsCol = db.collection("mobile_sessions");

  // Search for the session by current refreshHash
  const activeSession = await sessionsCol.findOne({ refreshHash: incomingHash });

  if (!activeSession) {
    // REUSE DETECTION CHECK: Did this hash exist as a previously rotated token?
    const reusedSession = await sessionsCol.findOne({ prevRefreshHash: incomingHash });
    if (reusedSession) {
      // Potential token theft / replay attack detected! Revoke the entire token family.
      await sessionsCol.updateMany(
        { familyId: reusedSession.familyId },
        { $set: { isRevoked: true, revokedAt: new Date(), revocationReason: "reuse_detected" } },
      );

      await writeAuditLog(db, {
        actorId: reusedSession.userId,
        action: "auth.mobile.reuse_detected",
        targetType: "token_family",
        targetId: reusedSession.familyId,
        metadata: { ip, deviceId },
      });

      return {
        ok: false,
        status: 401,
        code: "TOKEN_REVOKED",
        error: "Security breach detected: compromised refresh token reused. All active sessions have been revoked.",
      };
    }

    return { ok: false, status: 401, code: "INVALID_TOKEN", error: "Invalid refresh token" };
  }

  // Check if session is already revoked
  if (activeSession.isRevoked) {
    await sessionsCol.updateMany(
      { familyId: activeSession.familyId },
      { $set: { isRevoked: true, revokedAt: new Date(), revocationReason: "revoked_session_reuse" } },
    );
    return { ok: false, status: 401, code: "TOKEN_REVOKED", error: "Session has been revoked. Please log in again." };
  }

  // Check TTL and absolute max lifetime
  const now = new Date();
  if (activeSession.expiresAt < now || (activeSession.maxLifetime && activeSession.maxLifetime < now)) {
    return { ok: false, status: 401, code: "TOKEN_EXPIRED", error: "Refresh token expired. Please log in again." };
  }

  // Check device consistency if deviceId is provided
  if (deviceId && activeSession.deviceId && activeSession.deviceId !== String(deviceId)) {
    // Allow graceful device handoff or flag suspicious behavior
    console.warn(`[mobile-auth] Device ID mismatch during refresh: expected ${activeSession.deviceId}, got ${deviceId}`);
  }

  // Check user active and sessionVersion
  const user = await db.collection("users").findOne(
    ObjectId.isValid(activeSession.userId)
      ? { _id: new ObjectId(activeSession.userId) }
      : { _id: activeSession.userId }
  );

  if (!user || user.active === false || user.emailVerified === false) {
    await sessionsCol.updateOne({ _id: activeSession._id }, { $set: { isRevoked: true, revokedAt: now } });
    return { ok: false, status: 401, code: "ACCOUNT_INACTIVE", error: "Account is no longer active." };
  }

  // Generate new refresh token for rotation
  const newRefreshToken = randomToken(32);
  const newRefreshHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Atomically update the session document
  const updateResult = await sessionsCol.findOneAndUpdate(
    { _id: activeSession._id, refreshHash: incomingHash },
    {
      $set: {
        refreshHash: newRefreshHash,
        prevRefreshHash: incomingHash,
        lastUsedAt: now,
        expiresAt: newExpiresAt,
        ip: String(ip || "unknown"),
      },
    },
    { returnDocument: "after" },
  );

  if (!updateResult) {
    return { ok: false, status: 409, code: "CONCURRENT_ROTATION", error: "Concurrent refresh in progress. Please retry." };
  }

  // Issue new short-lived access token
  const newAccessToken = signAccessToken({
    userId: user._id.toString(),
    role: user.role || "user",
    sessionId: activeSession._id.toString(),
    sessionVersion: user.sessionVersion || 0,
  });

  return {
    ok: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      sessionId: activeSession._id.toString(),
    },
  };
}

/**
 * Authenticates a mobile Bearer request.
 * Mirrors getSessionWithRole but enforces Bearer tokens and rejects browser cookies.
 */
export async function getMobileSession(request, allowedRoles = []) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      session: null,
      error: Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Bearer token required in Authorization header." } },
        { status: 401 }
      ),
    };
  }

  const tokenString = authHeader.slice(7).trim();
  const verification = verifyAccessToken(tokenString);

  if (!verification.valid) {
    const isExpired = verification.expired === true;
    return {
      session: null,
      error: Response.json(
        {
          error: {
            code: isExpired ? "TOKEN_EXPIRED" : "UNAUTHENTICATED",
            message: verification.error || "Invalid or expired access token.",
          },
        },
        { status: 401 }
      ),
    };
  }

  const { sub: userId, sid: sessionId, sv: tokenSessionVersion } = verification.payload;

  try {
    const db = await getDb();

    // Query user record
    const userQuery = ObjectId.isValid(userId)
      ? { _id: new ObjectId(userId) }
      : { _id: userId };
    const user = await db.collection("users").findOne(userQuery);

    if (!user || user.active === false || user.emailVerified === false) {
      return {
        session: null,
        error: Response.json(
          { error: { code: "ACCOUNT_INACTIVE", message: "User account is disabled or unverified." } },
          { status: 401 }
        ),
      };
    }

    // Verify sessionVersion matches (invalidates mobile sessions on password reset / admin role change)
    const currentVersion = user.sessionVersion || 0;
    if (currentVersion !== Number(tokenSessionVersion)) {
      return {
        session: null,
        error: Response.json(
          { error: { code: "TOKEN_REVOKED", message: "Session invalidated due to password change or security update." } },
          { status: 401 }
        ),
      };
    }

    // Verify mobile session record is active in DB
    const sessionQuery = ObjectId.isValid(sessionId)
      ? { _id: new ObjectId(sessionId) }
      : { _id: sessionId };
    const mobileSession = await db.collection("mobile_sessions").findOne(sessionQuery);

    if (!mobileSession || mobileSession.isRevoked) {
      return {
        session: null,
        error: Response.json(
          { error: { code: "SESSION_TERMINATED", message: "This mobile session has been logged out or revoked." } },
          { status: 401 }
        ),
      };
    }

    // Check Role Authorization
    const role = user.role || "user";
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return {
        session: null,
        error: Response.json(
          { error: { code: "FORBIDDEN", message: `Access forbidden for role: ${role}` } },
          { status: 403 }
        ),
      };
    }

    const session = {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role,
        active: user.active !== false,
        sessionVersion: currentVersion,
      },
      sessionId: mobileSession._id.toString(),
      deviceId: mobileSession.deviceId,
      familyId: mobileSession.familyId,
    };

    return { session, error: null };
  } catch (error) {
    console.error("[mobile-auth] Session resolution failed closed:", error);
    return {
      session: null,
      error: Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Authentication service temporarily unavailable." } },
        { status: 500 }
      ),
    };
  }
}

/**
 * Checks a password against the Have I Been Pwned k-Anonymity breach API.
 * Returns { breached: true, count } if the password is known in data breaches.
 * Fails safely/open if the HIBP service is unreachable, logging a warning.
 */
export async function checkBreachedPassword(password) {
  if (!password || typeof password !== "string") return { breached: false };

  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.warn(`[hibp] Breached password check returned non-200: ${res.status}`);
      return { breached: false };
    }

    const text = await res.text();
    const lines = text.split("\n");
    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(":");
      if (hashSuffix === suffix) {
        const count = parseInt(countStr, 10) || 1;
        return { breached: true, count };
      }
    }

    return { breached: false };
  } catch (err) {
    console.warn(`[hibp] Breached password check skipped (offline/timeout):`, err?.message || err);
    return { breached: false };
  }
}
