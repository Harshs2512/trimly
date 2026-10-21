import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import { profileUpdateSchema } from "@/lib/validations";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
  serializeUserProfile,
} from "@/lib/mobileResponse";

export async function GET(request) {
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

    const db = await getDb();
    const query = ObjectId.isValid(auth.session.user.id)
      ? { _id: new ObjectId(auth.session.user.id) }
      : { _id: auth.session.user.id };

    const user = await db.collection("users").findOne(query);
    if (!user) {
      return mobileError({
        code: "USER_NOT_FOUND",
        message: "User not found.",
        status: 404,
        requestId,
      });
    }

    return mobileSuccess(serializeUserProfile(user), { requestId });
  } catch (error) {
    console.error("[mobile-user-profile-get]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to fetch profile.",
      status: 500,
      requestId,
    });
  }
}

export async function PATCH(request) {
  return handleUpdate(request);
}

export async function PUT(request) {
  return handleUpdate(request);
}

async function handleUpdate(request) {
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

    const validation = profileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return mobileError({
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: validation.error.flatten(),
        status: 400,
        requestId,
      });
    }

    // Protect against mass-assignment
    const updateDoc = {
      name: validation.data.name,
      updatedAt: new Date(),
    };
    if (validation.data.phone !== undefined) {
      updateDoc.phone = validation.data.phone;
    }

    const db = await getDb();
    const query = ObjectId.isValid(auth.session.user.id)
      ? { _id: new ObjectId(auth.session.user.id), active: { $ne: false } }
      : { _id: auth.session.user.id, active: { $ne: false } };

    const updateRes = await db.collection("users").updateOne(query, { $set: updateDoc });
    if (!updateRes.matchedCount) {
      return mobileError({
        code: "USER_NOT_FOUND",
        message: "User not found or account deactivated.",
        status: 404,
        requestId,
      });
    }

    const updated = await db.collection("users").findOne(query);
    return mobileSuccess(
      {
        user: serializeUserProfile(updated),
        message: "Profile updated successfully.",
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-user-profile-update]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to update profile.",
      status: 500,
      requestId,
    });
  }
}
