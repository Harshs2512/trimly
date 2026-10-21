import { getDb } from "@/lib/mongodb";
import { mobileRefreshSchema } from "@/lib/validations";
import { rotateMobileSession } from "@/lib/mobileAuth";
import { getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
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

    const validation = mobileRefreshSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const ip = getMobileClientIp(request);
    const db = await getDb();

    const rotationResult = await rotateMobileSession(db, {
      refreshToken: validation.data.refreshToken,
      deviceId: validation.data.deviceId,
      ip,
    });

    if (!rotationResult.ok) {
      return mobileError({
        code: rotationResult.code || "TOKEN_ERROR",
        message: rotationResult.error || "Token refresh failed.",
        status: rotationResult.status || 401,
        requestId,
      });
    }

    return mobileSuccess(rotationResult.data, { requestId });
  } catch (error) {
    console.error("[mobile-refresh]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred during token refresh.",
      status: 500,
      requestId,
    });
  }
}
