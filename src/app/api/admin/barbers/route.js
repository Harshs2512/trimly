import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { escapeRegex, parsePagination, safeInternalError } from "@/lib/api";

export async function GET(request) {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;
    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const status = url.searchParams.get("status")?.trim();
    const search = url.searchParams.get("search")?.trim();

    const db = await getDb();
    const query = { deletedAt: { $exists: false } };

    if (status && status !== "all") {
      if (status === "pending") {
        query.verificationStatus = { $in: ["pending", null] };
      } else {
        query.verificationStatus = status;
      }
    }

    if (search) {
      const reg = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [{ shopName: reg }, { address: reg }];
    }

    const [total, barbers, pendingCount, verifiedCount, rejectedCount] = await Promise.all([
      db.collection("barbers").countDocuments(query),
      db.collection("barbers").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection("barbers").countDocuments({ verificationStatus: { $in: ["pending", null] }, deletedAt: { $exists: false } }),
      db.collection("barbers").countDocuments({ verificationStatus: "verified", deletedAt: { $exists: false } }),
      db.collection("barbers").countDocuments({ verificationStatus: "rejected", deletedAt: { $exists: false } }),
    ]);

    return Response.json({
      barbers,
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      counts: {
        all: pendingCount + verifiedCount + rejectedCount,
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
      },
    });
  } catch (error) {
    return safeInternalError(error, "admin-barbers-list");
  }
}
