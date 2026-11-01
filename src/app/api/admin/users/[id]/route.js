import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { adminUserUpdateSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { safeInternalError, rejectCrossSiteRequest } from "@/lib/api";
import { cancelActiveBookingsForBarber, cancelActiveBookingsForCustomer } from "@/lib/accountLifecycle";
import { acquireMongoLock } from "@/lib/locks";
import { resolveCityCoordinates } from "@/lib/geo";

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

    if (validation.data.action === "revoke_sessions") {
      await users.updateOne(
        { _id: targetId },
        { $inc: { sessionVersion: 1 }, $set: { updatedAt: new Date() } }
      );
      await writeAuditLog(db, {
        actorId: session.user.id,
        action: "admin.user.revoke_sessions",
        targetType: "user",
        targetId: id,
        metadata: { targetEmail: target.email },
      });
      return Response.json({ ok: true, message: "All sessions revoked for user." });
    }

    const { role, active, name, phone, city, address, coordinates } = validation.data;
    const removingActiveAdmin = target.role === "admin" && target.active !== false &&
      ((role && role !== "admin") || active === false);

    const updateFields = { updatedAt: new Date() };
    if (role !== undefined) updateFields.role = role;
    if (active !== undefined) updateFields.active = active;
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (city !== undefined) updateFields.city = city;
    if (address !== undefined) updateFields.address = address;
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      updateFields.location = { type: "Point", coordinates };
    } else if (city || address) {
      const fallbackCoords = resolveCityCoordinates(city || address);
      if (fallbackCoords) {
        updateFields.location = { type: "Point", coordinates: fallbackCoords };
      }
    }

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
      metadata: { role, active, name, phone, city, address },
    });

    return Response.json({ ok: true, message: "User updated successfully" });
  } catch (error) {
    return safeInternalError(error, "admin-user-update");
  }
}

export async function DELETE(request, { params }) {
  try {
    const originError = rejectCrossSiteRequest(request);
    if (originError) return originError;
    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid user ID" }, { status: 400 });
    if (id === session.user.id) {
      return Response.json({ error: "For safety, you cannot delete your own account." }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection("users");
    const targetId = new ObjectId(id);
    const target = await users.findOne({ _id: targetId });
    if (!target) return Response.json({ error: "User not found" }, { status: 404 });

    if (target.role === "admin" && target.active !== false) {
      const releaseAdminLock = await acquireMongoLock(db, "active-admin-mutation", 10_000);
      if (!releaseAdminLock) {
        return Response.json({ error: "Another administrator change is in progress. Please retry." }, { status: 409 });
      }
      try {
        const activeAdmins = await users.countDocuments({ role: "admin", active: { $ne: false } });
        if (activeAdmins <= 1) {
          return Response.json({ error: "The last active administrator cannot be deleted." }, { status: 409 });
        }
      } finally {
        await releaseAdminLock();
      }
    }

    if (target.role === "barber") {
      const barberProfiles = await db.collection("barbers").find({ userId: id, deletedAt: { $exists: false } }).toArray();
      await db.collection("barbers").updateMany(
        { userId: id, deletedAt: { $exists: false } },
        { $set: { verificationStatus: "rejected", verifiedAt: null, deletedAt: new Date(), updatedAt: new Date() } },
      );
      await Promise.all(barberProfiles.map((barber) => cancelActiveBookingsForBarber(
        db,
        barber,
        "The barber account was removed by administrator.",
      )));
    }
    await cancelActiveBookingsForCustomer(db, id, "The customer account was removed by administrator.");

    await users.updateOne(
      { _id: targetId },
      { $set: { active: false, deletedAt: new Date(), updatedAt: new Date() }, $inc: { sessionVersion: 1 } },
    );

    await writeAuditLog(db, {
      actorId: session.user.id,
      action: "admin.user.delete",
      targetType: "user",
      targetId: id,
      metadata: { targetEmail: target.email, role: target.role },
    });

    return Response.json({ ok: true, message: "User deleted successfully." });
  } catch (error) {
    return safeInternalError(error, "admin-user-delete");
  }
}
