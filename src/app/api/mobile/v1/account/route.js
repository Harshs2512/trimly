import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { deleteUserAccount } from "@/lib/accountLifecycle";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

export async function DELETE(request) {
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

    let confirmPassword = null;
    try {
      const body = await request.json();
      confirmPassword = body?.confirmPassword || null;
    } catch {
      // Optional if social login
    }

    const db = await getDb();
    const result = await deleteUserAccount(db, {
      userId: auth.session.user.id,
      confirmPassword,
    });

    if (!result.ok) {
      return mobileError({
        code: result.code || "DELETION_FAILED",
        message: result.error,
        status: result.status,
        requestId,
      });
    }

    return mobileSuccess(
      {
        ok: true,
        message: result.message,
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-account-delete]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to delete account.",
      status: 500,
      requestId,
    });
  }
}
