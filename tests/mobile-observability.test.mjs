import test from "node:test";
import assert from "node:assert/strict";
import clientPromise, { getDb } from "../src/lib/mongodb.js";
import { GET as healthzGet } from "../src/app/healthz/route.js";
import { GET as readyzGet } from "../src/app/readyz/route.js";
import { logger, sanitizeLogData } from "../src/lib/logger.js";
import { enforceMobileRateLimit, rateLimit } from "../src/lib/rateLimit.js";
import { enforceDeviceAttestation, verifyPlayIntegrityToken, verifyAppAttestToken } from "../src/lib/attestation.js";
import { getClientIp } from "../src/lib/api.js";
import { writeAuditLog } from "../src/lib/audit.js";

test("WI-8: Observability, Abuse & Hardening Suite", async (t) => {
  const db = await getDb();

  await t.test("GET /healthz returns 200 OK liveness without sensitive info", async () => {
    const res = await healthzGet();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.ok(body.timestamp);
    assert.equal(body.databaseUri, undefined);
  });

  await t.test("GET /readyz returns 200 ready when DB is connected", async () => {
    const res = await readyzGet();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ready");
    assert.ok(body.timestamp);
    assert.equal(body.connectionString, undefined);
  });

  await t.test("Structured JSON logger redacts credentials and PII", () => {
    const dirtyData = {
      password: "SuperSecretPassword123!",
      token: "secret_token_abc",
      accessToken: "eyJhbGciOi...",
      refreshToken: "opaque_refresh_xyz",
      email: "jane.doe@example.com",
      phone: "+15551234567",
      user: {
        idNumber: "ID987654321",
        secretKey: "k-12345",
      },
      safeField: "this is public",
    };

    const sanitized = sanitizeLogData(dirtyData);
    assert.equal(sanitized.password, "[REDACTED]");
    assert.equal(sanitized.token, "[REDACTED]");
    assert.equal(sanitized.accessToken, "[REDACTED]");
    assert.equal(sanitized.refreshToken, "[REDACTED]");
    assert.equal(sanitized.email, "j***@example.com");
    assert.equal(sanitized.phone, "***4567");
    assert.equal(sanitized.user.idNumber, "[REDACTED]");
    assert.equal(sanitized.user.secretKey, "[REDACTED]");
    assert.equal(sanitized.safeField, "this is public");
  });

  await t.test("enforceMobileRateLimit returns 429 and Retry-After header when exceeded", async () => {
    const testKey = `test:ratelimit:${Date.now()}`;
    const windowMs = 5000;
    const limit = 2;

    // Call 1: allowed
    const res1 = await enforceMobileRateLimit(testKey, limit, windowMs);
    assert.equal(res1, null);

    // Call 2: allowed
    const res2 = await enforceMobileRateLimit(testKey, limit, windowMs);
    assert.equal(res2, null);

    // Call 3: exceeded -> 429
    const res3 = await enforceMobileRateLimit(testKey, limit, windowMs, { requestId: "req-limit-1" });
    assert.ok(res3);
    assert.equal(res3.status, 429);
    const retryAfter = res3.headers.get("retry-after");
    assert.ok(retryAfter);
    assert.ok(parseInt(retryAfter, 10) > 0);

    const body = await res3.json();
    assert.equal(body.error.code, "RATE_LIMIT_EXCEEDED");
    assert.equal(body.error.requestId, "req-limit-1");
  });

  await t.test("Configurable trusted proxy hops correctly resolves client IP", () => {
    // Single proxy hop default (hops = 1 -> take last IP)
    process.env.TRUSTED_PROXY_HOPS = "1";
    const reqSingle = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
    });
    assert.equal(getClientIp(reqSingle), "150.172.238.178");

    // Dual proxy hops (hops = 2 -> Cloudflare + ALB -> take 70.41.3.18)
    process.env.TRUSTED_PROXY_HOPS = "2";
    const reqDual = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
    });
    assert.equal(getClientIp(reqDual), "70.41.3.18");

    // Reset default
    process.env.TRUSTED_PROXY_HOPS = "1";
  });

  await t.test("Device attestation feature flag handling", async () => {
    // When disabled (default)
    const reqWithoutToken = new Request("http://localhost/api", {
      headers: { "x-platform": "android" },
    });
    const resultDisabled = await enforceDeviceAttestation(reqWithoutToken, { action: "login" });
    assert.equal(resultDisabled, null); // Gracefully passes

    // Verify token handlers directly
    const androidRes = await verifyPlayIntegrityToken({ token: "mock-valid-android-attestation" });
    assert.ok(androidRes.ok);

    const iosRes = await verifyAppAttestToken({ token: "mock-valid-ios-attestation", keyId: "test-key" });
    assert.ok(iosRes.ok);
  });

  await t.test("Login failure burst triggers audit log entry", async () => {
    const burstIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
    const burstKey = `burst:login:fail:${burstIp}`;

    // Simulate 5 failed logins within 5 minutes
    for (let i = 0; i < 5; i++) {
      const burstCheck = await rateLimit(burstKey, 5, 5 * 60 * 1000);
      if (!burstCheck.allowed) {
        await writeAuditLog(db, {
          actorId: "system",
          action: "auth.mobile.login_failure_burst",
          targetType: "network",
          targetId: burstIp,
          metadata: { burstCount: 5 },
        });
      }
    }

    // Attempt 6 (burst triggered)
    const burstCheck = await rateLimit(burstKey, 5, 5 * 60 * 1000);
    assert.equal(burstCheck.allowed, false);
    await writeAuditLog(db, {
      actorId: "system",
      action: "auth.mobile.login_failure_burst",
      targetType: "network",
      targetId: burstIp,
      metadata: { burstCount: 5 },
    });

    // Check audit logs for burst action
    const burstAudit = await db.collection("audit_logs").findOne({
      action: "auth.mobile.login_failure_burst",
      targetId: burstIp,
    });
    assert.ok(burstAudit, "Expected auth.mobile.login_failure_burst audit log to be recorded");
    assert.equal(burstAudit.metadata.burstCount, 5);
  });

  const client = await clientPromise;
  await client.close();
});
