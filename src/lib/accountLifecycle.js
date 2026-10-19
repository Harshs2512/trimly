import { legacyBarberIdentifiers, resolveBarber, canonicalBarberId } from "./booking.js";
import { createNotification } from "./notifications.js";
import { updateBarberWaitingTime } from "./waitingTime.js";

const ACTIVE_STATUSES = ["pending", "confirmed"];

async function cancelBookingIfActive(db, booking, reason) {
  const result = await db.collection("bookings").findOneAndUpdate(
    { _id: booking._id, status: { $in: ACTIVE_STATUSES } },
    {
      $set: { status: "cancelled", cancelReason: reason, updatedAt: new Date() },
      $unset: { reservationKeys: "" },
    },
    { returnDocument: "after" },
  );

  return result || null;
}

export async function cancelActiveBookingsForBarber(db, barber, reason) {
  if (!barber) return 0;

  const resolved = typeof barber === "string" ? await resolveBarber(db, barber) : barber;
  const identifiers = legacyBarberIdentifiers(resolved || barber);
  const bookings = await db.collection("bookings").find({
    barberId: { $in: identifiers },
    status: { $in: ACTIVE_STATUSES },
  }).toArray();

  const cancelled = (await Promise.all(
    bookings.map((booking) => cancelBookingIfActive(db, booking, reason)),
  )).filter(Boolean);

  await Promise.all(cancelled.map((booking) => createNotification(db, {
    userId: booking.userId,
    type: "booking_update",
    message: `Your ${booking.service} booking was cancelled. ${reason}`,
    bookingId: booking._id.toString(),
  })));

  if (cancelled.length) {
    await updateBarberWaitingTime(db, canonicalBarberId(resolved || barber));
  }
  return cancelled.length;
}

export async function cancelActiveBookingsForCustomer(db, userId, reason) {
  const bookings = await db.collection("bookings").find({
    userId,
    status: { $in: ACTIVE_STATUSES },
  }).toArray();

  const cancelled = (await Promise.all(
    bookings.map((booking) => cancelBookingIfActive(db, booking, reason)),
  )).filter(Boolean);

  const barberIds = new Set();
  await Promise.all(cancelled.map(async (booking) => {
    const barber = await resolveBarber(db, booking.barberId);
    if (!barber) return;
    barberIds.add(canonicalBarberId(barber));
    if (barber.userId) {
      await createNotification(db, {
        userId: barber.userId,
        type: "booking_update",
        message: `A ${booking.service} booking was cancelled because the customer account is no longer active.`,
        bookingId: booking._id.toString(),
      });
    }
  }));

  await Promise.all([...barberIds].map((barberId) => updateBarberWaitingTime(db, barberId)));
  return cancelled.length;
}

/**
 * Complete account deletion and data anonymization / DPDP / GDPR lifecycle.
 */
export async function deleteUserAccount(db, { userId, confirmPassword = null }) {
  const { ObjectId } = await import("mongodb");
  const bcrypt = (await import("bcryptjs")).default;
  const { writeAuditLog } = await import("./audit.js");

  const query = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId };
  const user = await db.collection("users").findOne(query);

  if (!user || user.active === false) {
    return { ok: false, status: 404, code: "USER_NOT_FOUND", error: "User not found or already deleted." };
  }

  // 1. Guard against deleting the last remaining admin
  if (user.role === "admin") {
    const adminCount = await db
      .collection("users")
      .countDocuments({ role: "admin", active: { $ne: false } });
    if (adminCount <= 1) {
      return {
        ok: false,
        status: 400,
        code: "LAST_ADMIN",
        error: "Cannot delete the last remaining administrator account.",
      };
    }
  }

  // 2. Re-authentication check if user has a password
  if (user.password && confirmPassword) {
    const isPasswordValid = await bcrypt.compare(confirmPassword, user.password);
    if (!isPasswordValid) {
      return {
        ok: false,
        status: 401,
        code: "INVALID_CREDENTIALS",
        error: "Incorrect password verification.",
      };
    }
  }

  const userIdStr = user._id.toString();

  // 3. Barber cleanup
  if (user.role === "barber") {
    const barber = await db.collection("barbers").findOne({ userId: userIdStr, deletedAt: { $exists: false } });
    if (barber) {
      await cancelActiveBookingsForBarber(db, barber, "Barber account has been deleted.");
      await db.collection("barbers").updateOne(
        { _id: barber._id },
        {
          $set: {
            deletedAt: new Date(),
            verificationStatus: "deleted",
            phone: null,
            idNumber: null,
            idDocumentImage: null,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  // 4. Customer cleanup
  await cancelActiveBookingsForCustomer(db, userIdStr, "Customer account has been deleted.");

  // 5. Revoke mobile sessions, devices and favorites
  await Promise.all([
    db.collection("mobile_sessions").deleteMany({ userId: userIdStr }),
    db.collection("devices").deleteMany({ userId: userIdStr }),
    db.collection("favourites").deleteMany({ userId: userIdStr }),
  ]);

  // 6. Anonymize user record (Retention policy: keep minimal unlinked placeholder for DB integrity)
  const now = new Date();
  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        name: "Deleted User",
        email: `deleted_${userIdStr}@deleted.trimly.local`,
        phone: null,
        active: false,
        deletedAt: now,
        sessionVersion: (user.sessionVersion || 1) + 10,
        updatedAt: now,
      },
      $unset: {
        password: "",
        googleSub: "",
        appleSub: "",
      },
    }
  );

  // 7. Anonymize reviews
  await db.collection("reviews").updateMany(
    { userId: userIdStr },
    { $set: { userName: "Deleted User" } }
  );

  // 8. Audit log
  await writeAuditLog(db, {
    actorId: userIdStr,
    action: "account.deleted",
    targetType: "user",
    targetId: userIdStr,
    metadata: { role: user.role, deletedAt: now },
  });

  return { ok: true, message: "Account deleted and personal data anonymized successfully." };
}

