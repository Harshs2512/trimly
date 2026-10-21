import {
  sniffImageMimeType,
  stripExifFromJpeg,
  scanForMalware,
  storage,
} from "@/lib/storage";
import { getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";

export async function PUT(request) {
  return handleUpload(request);
}

export async function POST(request) {
  return handleUpload(request);
}

async function handleUpload(request) {
  const requestId = getRequestId(request);
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Missing object key.",
        status: 400,
        requestId,
      });
    }

    const rawBuffer = Buffer.from(await request.arrayBuffer());
    if (rawBuffer.length === 0) {
      return mobileError({
        code: "EMPTY_FILE",
        message: "Uploaded file cannot be empty.",
        status: 400,
        requestId,
      });
    }

    if (rawBuffer.length > 5 * 1024 * 1024) {
      return mobileError({
        code: "FILE_TOO_LARGE",
        message: "File exceeds 5 MB limit.",
        status: 400,
        requestId,
      });
    }

    // 1. Magic byte sniffing
    const mimeType = sniffImageMimeType(rawBuffer);
    if (!mimeType) {
      return mobileError({
        code: "INVALID_MIME_TYPE",
        message: "File is not a valid image (JPEG, PNG, or WebP).",
        status: 400,
        requestId,
      });
    }

    // 2. Malware scan hook
    const scan = await scanForMalware(rawBuffer);
    if (!scan.safe) {
      return mobileError({
        code: "MALWARE_DETECTED",
        message: "File failed security scan.",
        status: 400,
        requestId,
      });
    }

    // 3. Strip EXIF / GPS metadata if JPEG
    let processedBuffer = rawBuffer;
    if (mimeType === "image/jpeg") {
      processedBuffer = stripExifFromJpeg(rawBuffer);
    }

    const isPrivate = key.startsWith("private/");
    const result = await storage.putObject({
      key,
      buffer: processedBuffer,
      contentType: mimeType,
      isPrivate,
    });

    return mobileSuccess(result, { status: 200, requestId });
  } catch (error) {
    console.error("[mobile-media-upload]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to upload media.",
      status: 500,
      requestId,
    });
  }
}
