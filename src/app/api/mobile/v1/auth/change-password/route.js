import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { changePasswordSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { enforceAppVersion, getMobileClientIp, getRequestId, mobileError, mobileSuccess } from "@/lib/mobileResponse";

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

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: validation.error.issues[0]?.message || "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    const { currentPassword, newPassword } = validation.data;
    const db = await getDb();
    const query = ObjectId.isValid(auth.session.user.id)
      ? { _id: new ObjectId(auth.session.user.id) }
      : { _id: auth.session.user.id };

    const user = await db.collection("users").findOne(query);
    if (!user || user.active === false) {
      return mobileError({
        code: "USER_NOT_FOUND",
        message: "User not found or account deactivated.",
        status: 404,
        requestId,
      });
    }

    // Verify current password if user has an existing password
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return mobileError({
          code: "INVALID_CREDENTIALS",
          message: "Current password is incorrect.",
          status: 401,
          requestId,
        });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const now = new Date();

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          passwordChangedAt: now,
          updatedAt: now,
        },
      }
    );

    const ip = getMobileClientIp(request);
    await writeAuditLog(db, {
      actorId: user._id.toString(),
      action: "auth.mobile.password_changed",
      targetType: "user",
      targetId: user._id.toString(),
      metadata: { ip },
    });

    return mobileSuccess(
      {
        message: "Password changed successfully.",
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-change-password]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "An error occurred while changing password.",
      status: 500,
      requestId,
    });
  }
}

