import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { safeInternalError, json } from "@/lib/api";

export async function GET() {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const db = await getDb();
    const leadsCol = db.collection("leads");
    const eventsCol = db.collection("lead_events");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const past30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const [
      total,
      today,
      week,
      month,
      uncontactedOver15m,
      sourceBreakdown,
      statusBreakdown,
      whatsappClicks,
      callClicks,
    ] = await Promise.all([
      leadsCol.countDocuments({ isDeleted: { $ne: true } }),
      leadsCol.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: startOfToday } }),
      leadsCol.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: past7d } }),
      leadsCol.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: past30d } }),
      leadsCol.countDocuments({
        isDeleted: { $ne: true },
        status: "new",
        createdAt: { $lte: fifteenMinAgo },
      }),
      leadsCol
        .aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: "$source", count: { $sum: 1 } } },
        ])
        .toArray(),
      leadsCol
        .aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
      eventsCol.countDocuments({ type: { $in: ["whatsapp", "whatsapp_click"] } }),
      eventsCol.countDocuments({ type: { $in: ["call", "call_click"] } }),
    ]);

    const sourceMap = {};
    sourceBreakdown.forEach((s) => {
      sourceMap[s._id || "unknown"] = s.count;
    });

    const statusMap = {};
    statusBreakdown.forEach((s) => {
      statusMap[s._id || "unknown"] = s.count;
    });

    return json({
      metrics: {
        total,
        today,
        week,
        month,
        uncontactedOver15m,
        whatsappClicks,
        callClicks,
        bySource: sourceMap,
        byStatus: statusMap,
      },
    });
  } catch (error) {
    return safeInternalError(error, "admin-leads-stats");
  }
}

