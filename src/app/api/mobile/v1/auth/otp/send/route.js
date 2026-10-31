import { getDb } from "@/lib/mongodb";
import { sendOtpSchema } from "@/lib/validations";
import { sendPhoneOtp } from "@/lib/phoneAuth";
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

    const validation = sendOtpSchema.safeParse(body);
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
    const result = await sendPhoneOtp(db, {
      phone: validation.data.phone,
      email: validation.data.email,
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

    return mobileSuccess(
      {
        message: result.message,
        deliveryMethod: result.deliveryMethod,
        smsDelivered: result.smsDelivered,
        emailDelivered: result.emailDelivered,
        targetEmail: result.targetEmail,
        developmentCode: result.developmentCode,
        gatewayWarning: result.gatewayWarning,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-otp-send]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to send OTP. Please try again later.",
      status: 500,
      requestId,
    });
  }
}
