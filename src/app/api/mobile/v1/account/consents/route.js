import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

export async function GET(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request);
    if (!auth.session) {
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
    }

    const db = await getDb();
    const consents = await db
      .collection("consents")
      .find({ userId: auth.session.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return mobileSuccess(
      {
        consents: consents.map((c) => ({
          id: c._id.toString(),
          policyVersion: c.policyVersion,
          purposes: c.purposes || [],
          timestamp: c.createdAt,
        })),
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-consents-get]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch consent records.",
      status: 500,
      requestId,
    });
  }
}

export async function POST(request) {
  const versionError = enforceAppVersion(request);
  if (versionError) return versionError;

  const requestId = getRequestId(request);
  try {
    const auth = await getMobileSession(request);
    if (!auth.session) {
      return mobileError({
        code: auth.error.code,
        message: auth.error.message,
        status: auth.error.status,
        requestId,
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return mobileError({
        code: "INVALID_JSON",
        message: "Invalid JSON request body.",
        status: 400,
        requestId,
      });
    }

    const { policyVersion = "1.0", purposes = ["terms", "privacy"] } = body;
    const db = await getDb();
    const now = new Date();

    const insertRes = await db.collection("consents").insertOne({
      userId: auth.session.user.id,
      policyVersion: String(policyVersion),
      purposes: Array.isArray(purposes) ? purposes : [String(purposes)],
      ip: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "",
      createdAt: now,
    });

    return mobileSuccess(
      {
        ok: true,
        consentId: insertRes.insertedId.toString(),
        message: "Consent recorded successfully.",
      },
      { status: 201, requestId }
    );
  } catch (error) {
    console.error("[mobile-consents-post]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to record consent.",
      status: 500,
      requestId,
    });
  }
}
