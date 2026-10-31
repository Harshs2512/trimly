import { getDb } from "@/lib/mongodb";
import { verifyOtpSchema } from "@/lib/validations";
import { verifyPhoneOtpAndLogin } from "@/lib/phoneAuth";
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

    const validation = verifyOtpSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: validation.error.issues[0]?.message || "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const ip = getMobileClientIp(request);
    const db = await getDb();
    const result = await verifyPhoneOtpAndLogin(db, {
      phone: validation.data.phone,
      code: validation.data.code,
      name: validation.data.name,
      email: validation.data.email,
      deviceId: validation.data.deviceId,
      platform: validation.data.platform,
      appVersion: validation.data.appVersion,
      ip,
    });

    if (!result.ok) {
      return mobileError({
        code: result.code,
        message: result.error,
        status: result.status,
        requestId,
      });
    }

    return mobileSuccess(result.data, { requestId });
  } catch (error) {
    console.error("[mobile-otp-verify]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to verify OTP. Please try again later.",
      status: 500,
      requestId,
    });
  }
}
