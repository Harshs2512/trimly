import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { escapeRegex, parsePagination, safeInternalError } from "@/lib/api";
import { resolveCityCoordinates } from "@/lib/geo";

export async function GET(request) {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const search = url.searchParams.get("search")?.trim();
    const roleFilter = url.searchParams.get("role")?.trim();
    const statusFilter = url.searchParams.get("status")?.trim();
    const cityFilter = url.searchParams.get("city")?.trim();
    const createdRange = url.searchParams.get("createdRange")?.trim();

    const query = {};

    if (search) {
      const reg = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [
        { name: reg },
        { email: reg },
        { phone: reg },
        { city: reg },
        { address: reg },
      ];
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

    if (cityFilter && cityFilter !== "all") {
      query.city = { $regex: `^${escapeRegex(cityFilter)}$`, $options: "i" };
    }

    if (createdRange && createdRange !== "all") {
      const now = new Date();
      if (createdRange === "today") {
        const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: past24h };
      } else if (createdRange === "week") {
        const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: past7d };
      } else if (createdRange === "month") {
        const past30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: past30d };
      }
    }

    const db = await getDb();
    const usersCol = db.collection("users");
    const [total, rawUsers, distinctCities] = await Promise.all([
      usersCol.countDocuments(query),
      usersCol
        .find(query, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      usersCol.distinct("city", { city: { $exists: true, $ne: "" } }),
    ]);

    const users = rawUsers.map((u) => {
      let coords = u.location?.coordinates;
      if (!coords || !Array.isArray(coords)) {
        coords = resolveCityCoordinates(u.city || u.address);
      }
      return {
        ...u,
        _id: u._id.toString(),
        createdAt: u.createdAt?.toISOString?.() || u.createdAt,
        updatedAt: u.updatedAt?.toISOString?.() || u.updatedAt,
        city: u.city || "",
        address: u.address || "",
        coordinates: coords || [77.209, 28.6139],
      };
    });

    return Response.json({
      users,
      cities: distinctCities.filter(Boolean),
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
