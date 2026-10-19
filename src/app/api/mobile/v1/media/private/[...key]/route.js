import { storage } from "@/lib/storage";
import { getMobileSession } from "@/lib/mobileAuth";
import { getDb } from "@/lib/mongodb";
import { writeAuditLog } from "@/lib/audit";
import { getRequestId, mobileError } from "@/lib/mobileResponse";

export async function GET(request, { params }) {
  const requestId = getRequestId(request);
  try {
    const { key: keySegments } = await params;
    const key = Array.isArray(keySegments) ? keySegments.join("/") : keySegments;

    // Path traversal check
    if (!key || key.includes("..")) {
      return mobileError({
        code: "INVALID_PATH",
        message: "Invalid media key.",
        status: 400,
        requestId,
      });
    }

    const { searchParams } = new URL(request.url);
    const exp = searchParams.get("exp");
    const sig = searchParams.get("sig");

    let isAuthorized = false;
    let actorId = "signed-url";

    // 1. Verify via signed URL signature
    if (exp && sig) {
      isAuthorized = storage.verifySignedDownloadUrl({ key, expires: exp, signature: sig });
    }

    // 2. Or verify via admin session
    if (!isAuthorized) {
      const auth = await getMobileSession(request, ["admin"]);
      if (auth.session) {
        isAuthorized = true;
        actorId = auth.session.user.id;
      }
    }

    if (!isAuthorized) {
      return mobileError({
        code: "FORBIDDEN",
        message: "You are not authorized to view this private document.",
        status: 403,
        requestId,
      });
    }

    const item = await storage.getObject({ key });
    if (!item) {
      return mobileError({
        code: "OBJECT_NOT_FOUND",
        message: "Document not found.",
        status: 404,
        requestId,
      });
    }

    // Audit log private document read
    const db = await getDb();
    await writeAuditLog(db, {
      actorId,
      action: "media.private_document_read",
      targetType: "media",
      targetId: key,
      metadata: { requestId, size: item.size },
    });

    return new Response(item.buffer, {
      status: 200,
      headers: {
        "Content-Type": item.contentType,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    console.error("[mobile-media-private]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to retrieve private document.",
      status: 500,
      requestId,
    });
  }
}
