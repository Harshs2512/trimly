import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { escapeRegex, parsePagination, safeInternalError } from "@/lib/api";

export async function GET(request) {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const search = url.searchParams.get("search")?.trim();
    const query = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { email: { $regex: escapeRegex(search), $options: "i" } },
          ],
        }
      : {};

    const db = await getDb();
    const col = db.collection("users");
    const [total, users] = await Promise.all([
      col.countDocuments(query),
      col.find(query, { projection: { password: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    ]);

    return Response.json({ users, pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    return safeInternalError(error, "users-list");
  }
}
