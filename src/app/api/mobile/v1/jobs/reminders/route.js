import { getDb } from "@/lib/mongodb";
import { sendAppointmentReminders } from "@/lib/push";
import { getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";

export async function POST(request) {
  return handleJob(request);
}

export async function GET(request) {
  return handleJob(request);
}

async function handleJob(request) {
  const requestId = getRequestId(request);
  try {
    const authHeader = request.headers.get("authorization") || "";
    const cronHeader = request.headers.get("x-cron-secret") || "";
    const expectedSecret = process.env.CRON_SECRET || process.env.REMINDERS_JOB_SECRET || "development-cron-secret";

    const isAuthorized =
      authHeader === `Bearer ${expectedSecret}` ||
      cronHeader === expectedSecret ||
      new URL(request.url).searchParams.get("secret") === expectedSecret;

    if (!isAuthorized && process.env.NODE_ENV === "production") {
      return mobileError({
        code: "UNAUTHORIZED",
        message: "Unauthorized job execution.",
        status: 401,
        requestId,
      });
    }

    const db = await getDb();
    const result = await sendAppointmentReminders(db);

    return mobileSuccess(
      {
        ok: true,
        ...result,
        timestamp: new Date().toISOString(),
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-jobs-reminders]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to run reminder job.",
      status: 500,
      requestId,
    });
  }
}
