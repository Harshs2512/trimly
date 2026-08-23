import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { adminUserUpdateSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { cancelActiveBookingsForBarber, cancelActiveBookingsForCustomer } from "@/lib/accountLifecycle";
import { acquireMongoLock } from "@/lib/locks";

export async function PUT(request, { params }) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid user ID" }, { status: 400 });
    if (id === session.user.id) {
      return Response.json({ error: "For safety, you cannot change your own role or activation status here." }, { status: 400 });
    }

    const validation = adminUserUpdateSchema.safeParse(await request.json());
    if (!validation.success) return Response.json({ error: validation.error.flatten() }, { status: 400 });

    const db = await getDb();
    const users = db.collection("users");
    const targetId = new ObjectId(id);
    const target = await users.findOne({ _id: targetId });
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });

    const { role, active } = validation.data;
    const removingActiveAdmin = target.role === "admin" && target.active !== false &&
      ((role && role !== "admin") || active === false);

    const updateFields = { updatedAt: new Date() };
    if (role !== undefined) updateFields.role = role;
    if (active !== undefined) updateFields.active = active;

    const sensitiveChanged = (role !== undefined && role !== target.role) ||
      (active !== undefined && active !== (target.active !== false));
    const update = { $set: updateFields };
    if (sensitiveChanged) update.$inc = { sessionVersion: 1 };

    let releaseAdminLock = null;
    if (removingActiveAdmin) {
      releaseAdminLock = await acquireMongoLock(db, "active-admin-mutation", 10_000);
      if (!releaseAdminLock) {
        return Response.json({ error: "Another administrator change is in progress. Please retry." }, { status: 409 });
      }
    }

    try {
      if (removingActiveAdmin) {
        const activeAdmins = await users.countDocuments({ role: "admin", active: { $ne: false } });
        if (activeAdmins <= 1) {
          return Response.json({ error: "The last active administrator cannot be demoted or deactivated." }, { status: 409 });
        }
      }
      await users.updateOne({ _id: targetId }, update);
    } finally {
      if (releaseAdminLock) await releaseAdminLock();
    }

    const removingBarberAccess = target.role === "barber" && (
      (role !== undefined && role !== "barber") || active === false
    );
    if (removingBarberAccess) {
      const barberProfiles = await db.collection("barbers").find({ userId: id, deletedAt: { $exists: false } }).toArray();
      await db.collection("barbers").updateMany(
        { userId: id, deletedAt: { $exists: false } },
        { $set: { verificationStatus: "rejected", verifiedAt: null, updatedAt: new Date() } },
      );
      await Promise.all(barberProfiles.map((barber) => cancelActiveBookingsForBarber(
        db,
        barber,
        "The barber account is no longer available.",
      )));
    }

    if (active === false) {
      await cancelActiveBookingsForCustomer(db, id, "The customer account is no longer active.");
    }

    await writeAuditLog(db, {
      actorId: session.user.id,
      action: "admin.user.update",
      targetType: "user",
      targetId: id,
      metadata: { role, active },
    });

    return Response.json({ ok: true, message: "User updated successfully" });
  } catch (error) {
    return safeInternalError(error, "admin-user-update");
  }
}
