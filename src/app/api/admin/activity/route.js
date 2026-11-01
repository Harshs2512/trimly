import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { escapeRegex, parsePagination, safeInternalError } from "@/lib/api";

export async function GET(request) {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const category = url.searchParams.get("category")?.trim();
    const search = url.searchParams.get("search")?.trim();

    const query = {};

    if (category && category !== "all") {
      if (category === "auth") {
        query.action = { $regex: "^auth\\." };
      } else if (category === "admin") {
        query.action = { $regex: "^admin\\." };
      } else if (category === "booking") {
        query.$or = [{ action: { $regex: "booking" } }, { targetType: "booking" }];
      } else if (category === "barber") {
        query.$or = [{ action: { $regex: "barber" } }, { targetType: "barber" }];
      } else if (category === "user") {
        query.$or = [{ action: { $regex: "user" } }, { targetType: "user" }];
      } else if (category === "security") {
        query.action = {
          $in: [
            "auth.admin.lockout",
            "auth.barber.lockout",
            "auth.login.rate_limited",
            "auth.admin.security_code_failed",
            "auth.mobile.admin_login_blocked",
            "auth.login.blocked_deactivated",
          ],
        };
      }
    }

    if (search) {
      const reg = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [
        ...(query.$or || []),
        { action: reg },
        { targetId: reg },
        { actorId: reg },
        { "metadata.email": reg },
      ];
    }

    const db = await getDb();
    const col = db.collection("audit_logs");
    const [total, rawLogs] = await Promise.all([
      col.countDocuments(query),
      col.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    ]);

    // Enrich actor names where actorId is a valid user ObjectId
    const actorIds = [...new Set(rawLogs.map((l) => l.actorId).filter(Boolean))];
    const objectActorIds = actorIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const actors = objectActorIds.length
      ? await db.collection("users").find({ _id: { $in: objectActorIds } }, { projection: { name: 1, email: 1, role: 1 } }).toArray()
      : [];
    const actorMap = new Map(actors.map((a) => [a._id.toString(), a]));

    const logs = rawLogs.map((log) => {
      const actor = actorMap.get(String(log.actorId));
      return {
        ...log,
        _id: log._id.toString(),
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
        actorName: actor?.name || log.actorId || "System",
        actorEmail: actor?.email || (typeof log.metadata?.email === "string" ? log.metadata.email : null),
        actorRole: actor?.role || null,
      };
    });

    return Response.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return safeInternalError(error, "admin-activity-list");
  }
}

