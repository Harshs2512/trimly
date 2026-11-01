import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { safeInternalError } from "@/lib/api";

export async function GET() {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const db = await getDb();
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers24h,
      newUsers7d,
      customerCount,
      barberUserCount,
      adminUserCount,
      deactivatedUsers,

      totalBarbers,
      verifiedBarbers,
      pendingBarbers,
      rejectedBarbers,
      barberAggregates,

      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      declinedBookings,
      noShowBookings,
      bookings24h,

      totalAuditLogs,
      auditLogs24h,
      blockedMobileAdminLogins,
      securityLockouts,
      failedLogins,
      recentSecurityAlerts,
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").countDocuments({ createdAt: { $gte: past24h } }),
      db.collection("users").countDocuments({ createdAt: { $gte: past7d } }),
      db.collection("users").countDocuments({ role: "user" }),
      db.collection("users").countDocuments({ role: "barber" }),
      db.collection("users").countDocuments({ role: "admin" }),
      db.collection("users").countDocuments({ active: false }),

      db.collection("barbers").countDocuments({ deletedAt: { $exists: false } }),
      db.collection("barbers").countDocuments({ verificationStatus: "verified", deletedAt: { $exists: false } }),
      db.collection("barbers").countDocuments({ verificationStatus: { $in: ["pending", null] }, deletedAt: { $exists: false } }),
      db.collection("barbers").countDocuments({ verificationStatus: "rejected", deletedAt: { $exists: false } }),
      db.collection("barbers").aggregate([
        { $match: { deletedAt: { $exists: false } } },
        {
          $group: {
            _id: null,
            totalStaff: { $sum: { $ifNull: ["$staffCount", 1] } },
            totalChairs: { $sum: { $ifNull: ["$chairsCount", 1] } },
          },
        },
      ]).toArray(),

      db.collection("bookings").countDocuments(),
      db.collection("bookings").countDocuments({ status: "pending" }),
      db.collection("bookings").countDocuments({ status: "confirmed" }),
      db.collection("bookings").countDocuments({ status: "completed" }),
      db.collection("bookings").countDocuments({ status: "cancelled" }),
      db.collection("bookings").countDocuments({ status: "declined" }),
      db.collection("bookings").countDocuments({ status: "no_show" }),
      db.collection("bookings").countDocuments({ createdAt: { $gte: past24h } }),

      db.collection("audit_logs").countDocuments(),
      db.collection("audit_logs").countDocuments({ createdAt: { $gte: past24h } }),
      db.collection("audit_logs").countDocuments({ action: "auth.mobile.admin_login_blocked" }),
      db.collection("audit_logs").countDocuments({
        action: { $in: ["auth.admin.lockout", "auth.barber.lockout", "auth.login.rate_limited"] },
      }),
      db.collection("audit_logs").countDocuments({
        action: { $in: ["auth.admin.login_failed", "auth.barber.login_failed", "auth.user.login_failed", "auth.admin.security_code_failed"] },
      }),
      db.collection("audit_logs")
        .find({
          action: {
            $in: [
              "auth.mobile.admin_login_blocked",
              "auth.admin.lockout",
              "auth.barber.lockout",
              "auth.admin.security_code_failed",
              "auth.login.rate_limited",
            ],
          },
        })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray(),
    ]);

    const totalStaff = barberAggregates[0]?.totalStaff || 0;
    const totalChairs = barberAggregates[0]?.totalChairs || 0;
    const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

    return Response.json({
      summary: {
        totalUsers,
        totalBarbers,
        totalBookings,
        completionRate,
      },
      security: {
        totalAuditLogs,
        auditLogs24h,
        blockedMobileAdminLogins,
        securityLockouts,
        failedLogins,
        recentAlerts: recentSecurityAlerts.map((a) => ({
          ...a,
          _id: a._id.toString(),
          createdAt: a.createdAt?.toISOString?.() || a.createdAt,
        })),
      },
      customers: {
        total: customerCount,
        new24h: newUsers24h,
        new7d: newUsers7d,
        deactivated: deactivatedUsers,
      },
      barbers: {
        total: totalBarbers,
        verified: verifiedBarbers,
        pending: pendingBarbers,
        rejected: rejectedBarbers,
        accounts: barberUserCount,
        totalStaff,
        totalChairs,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        declined: declinedBookings,
        noShow: noShowBookings,
        new24h: bookings24h,
      },
      admins: {
        total: adminUserCount,
      },
    });
  } catch (error) {
    return safeInternalError(error, "admin-analytics");
  }
}

