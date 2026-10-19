import crypto from "crypto";
import { getMobileSession } from "@/lib/mobileAuth";
import { mediaUploadUrlSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { storage } from "@/lib/storage";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

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

    const userId = auth.session.user.id;

    // Per-user upload rate limiting (max 20 per 15 mins)
    const limiter = await rateLimit(`media:upload:${userId}`, 20, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return mobileError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Upload rate limit reached. Please wait before uploading more files.",
        status: 429,
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

    const validation = mediaUploadUrlSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const { purpose, contentType, fileSize } = validation.data;

    // Role check for private ID documents: must be barber or admin
    if (purpose === "id_document" && auth.session.user.role !== "barber" && auth.session.user.role !== "admin") {
      return mobileError({
        code: "FORBIDDEN",
        message: "Only barbers and administrators can upload identification documents.",
        status: 403,
        requestId,
      });
    }

    const extMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extMap[contentType] || "jpg";
    const isPrivate = purpose === "id_document";

    // Server-generated random object key (never user-supplied)
    const randomId = crypto.randomUUID();
    const objectKey = isPrivate
      ? `private/id_documents/${userId}/${randomId}.${ext}`
      : `public/${purpose}/${userId}/${randomId}.${ext}`;

    const uploadConfig = await storage.getUploadUrl({
      key: objectKey,
      contentType,
      maxSize: fileSize,
      isPrivate,
    });

    return mobileSuccess(uploadConfig, { status: 201, requestId });
  } catch (error) {
    console.error("[mobile-media-upload-url]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to generate media upload URL.",
      status: 500,
      requestId,
    });
  }
}
