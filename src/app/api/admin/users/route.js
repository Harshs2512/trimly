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
    const roleFilter = url.searchParams.get("role")?.trim();
    const statusFilter = url.searchParams.get("status")?.trim();

    const query = {};

    if (search) {
      const reg = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [{ name: reg }, { email: reg }, { phone: reg }];
    }

    if (roleFilter && roleFilter !== "all") {
      query.role = roleFilter;
    }

    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "active") {
        query.active = { $ne: false };
      } else if (statusFilter === "deactivated") {
        query.active = false;
      }
    }

    const db = await getDb();
    const usersCol = db.collection("users");
    const [total, rawUsers] = await Promise.all([
      usersCol.countDocuments(query),
      usersCol
        .find(query, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const users = rawUsers.map((u) => ({
      ...u,
      _id: u._id.toString(),
      createdAt: u.createdAt?.toISOString?.() || u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() || u.updatedAt,
    }));

    return Response.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return safeInternalError(error, "admin-users-list");
  }
}

