import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { parsePagination, safeInternalError } from "@/lib/api";

export async function GET(request) {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;
    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const db = await getDb();
    const query = { deletedAt: { $exists: false } };
    const [total, barbers] = await Promise.all([
      db.collection("barbers").countDocuments(query),
      db.collection("barbers").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    ]);
    return Response.json({ barbers, pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    return safeInternalError(error, "admin-barbers-list");
  }
}
