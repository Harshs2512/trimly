import { getMobileSession } from "@/lib/mobileAuth";
import { mediaCompleteSchema } from "@/lib/validations";
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

    const validation = mediaCompleteSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const { objectKey, purpose } = validation.data;
    const isPrivate = purpose === "id_document";

    // Path traversal check
    if (objectKey.includes("..") || objectKey.startsWith("/")) {
      return mobileError({
        code: "INVALID_PATH",
        message: "Invalid object key.",
        status: 400,
        requestId,
      });
    }

    const item = await storage.getObject({ key: objectKey });
    if (!item) {
      return mobileError({
        code: "OBJECT_NOT_FOUND",
        message: "Uploaded media file not found in storage. Ensure file was uploaded successfully.",
        status: 404,
        requestId,
      });
    }

    const publicUrl = isPrivate ? null : `${storage.cdnUrl}/${objectKey}`;

    return mobileSuccess(
      {
        status: "ready",
        objectKey,
        url: publicUrl,
        isPrivate,
        contentType: item.contentType,
        size: item.size,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-media-complete]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to record media completion.",
      status: 500,
      requestId,
    });
  }
}
