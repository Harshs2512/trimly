import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getMobileSession } from "@/lib/mobileAuth";
import {
  enforceAppVersion,
  getRequestId,
  mobileError,
  mobileSuccess,
} from "@/lib/mobileResponse";

export async function DELETE(request, { params }) {
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

    const { id } = await params;
    const userId = auth.session.user.id;
    const db = await getDb();

    // Delete by deviceId string or ObjectId
    const deleteQuery = {
      userId,
      $or: [
        { deviceId: id },
        ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : []),
      ],
    };

    await db.collection("devices").deleteOne(deleteQuery);

    return mobileSuccess(
      {
        ok: true,
        message: "Device unregistered successfully.",
      },
      { requestId }
    );
  } catch (error) {
    console.error("[mobile-device-delete]", error);
    return mobileError({
      code: "INTERNAL_ERROR",
      message: "Failed to unregister device.",
      status: 500,
      requestId,
    });
  }
}
