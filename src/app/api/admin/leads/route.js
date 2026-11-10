import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { escapeRegex, parsePagination, safeInternalError, json } from "@/lib/api";

function formatCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request) {
  try {
    // 1. Admin Authentication Check
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const url = new URL(request.url);
    const isCsvExport = url.searchParams.get("export") === "csv" || url.searchParams.get("format") === "csv";
    const { page, limit, skip } = parsePagination(url.searchParams, { defaultLimit: 25, maxLimit: 100 });

    const search = url.searchParams.get("search")?.trim();
    const statusFilter = url.searchParams.get("status")?.trim();
    const typeFilter = url.searchParams.get("type")?.trim();
    const cityFilter = url.searchParams.get("city")?.trim();
    const sourceFilter = url.searchParams.get("source")?.trim();
    const createdRange = url.searchParams.get("createdRange")?.trim();

    const query = {
      isDeleted: { $ne: true },
    };

    if (search) {
      const reg = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [{ name: reg }, { phone: reg }, { email: reg }, { city: reg }, { interest: reg }];
    }

    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    if (typeFilter && typeFilter !== "all") {
      query.type = typeFilter;
    }

    if (cityFilter && cityFilter !== "all") {
      query.city = { $regex: `^${escapeRegex(cityFilter)}$`, $options: "i" };
    }

    if (sourceFilter && sourceFilter !== "all") {
      query.source = sourceFilter;
    }

    if (createdRange && createdRange !== "all") {
      const now = new Date();
      if (createdRange === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query.createdAt = { $gte: startOfDay };
      } else if (createdRange === "7d") {
        query.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (createdRange === "30d") {
        query.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    const db = await getDb();
    const collection = db.collection("leads");

    if (isCsvExport) {
      const leads = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(2000)
        .toArray();

      const headers = ["ID", "Type", "Name", "Phone", "Email", "City", "Interest", "Status", "Source", "Page", "CreatedAt"];
      const rows = leads.map((l) => [
        formatCsvField(l._id),
        formatCsvField(l.type),
        formatCsvField(l.name),
        formatCsvField(l.phone),
        formatCsvField(l.email || ""),
        formatCsvField(l.city),
        formatCsvField(l.interest || ""),
        formatCsvField(l.status),
        formatCsvField(l.source),
        formatCsvField(l.page || ""),
        formatCsvField(l.createdAt ? new Date(l.createdAt).toISOString() : ""),
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const filename = `trimlly_leads_${new Date().toISOString().slice(0, 10)}.csv`;

      return new Response(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const [total, leads] = await Promise.all([
      collection.countDocuments(query),
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    return json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return safeInternalError(error, "admin-leads-get");
  }
}

