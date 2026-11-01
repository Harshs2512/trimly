import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { safeInternalError } from "@/lib/api";
import { resolveCityCoordinates } from "@/lib/geo";

export async function GET() {
  try {
    const { error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const db = await getDb();
    const [rawBarbers, rawUsers] = await Promise.all([
      db
        .collection("barbers")
        .find(
          { deletedAt: { $exists: false } },
          {
            projection: {
              shopName: 1,
              address: 1,
              city: 1,
              verificationStatus: 1,
              staffCount: 1,
              chairsCount: 1,
              phone: 1,
              location: 1,
              createdAt: 1,
            },
          }
        )
        .toArray(),
      db
        .collection("users")
        .find(
          {},
          {
            projection: {
              name: 1,
              email: 1,
              phone: 1,
              role: 1,
              active: 1,
              city: 1,
              address: 1,
              location: 1,
              createdAt: 1,
            },
          }
        )
        .toArray(),
    ]);

    const citiesSet = new Set();

    const barbers = rawBarbers.map((b) => {
      let coords = b.location?.coordinates;
      if (!coords || !Array.isArray(coords) || coords.length !== 2) {
        coords = resolveCityCoordinates(b.city || b.address);
      }
      if (b.city) citiesSet.add(b.city);
      return {
        id: b._id.toString(),
        type: "barber",
        shopName: b.shopName || "Unnamed Barber",
        address: b.address || "Address pending",
        city: b.city || "Delhi NCR",
        verificationStatus: b.verificationStatus || "pending",
        staffCount: b.staffCount ?? 1,
        chairsCount: b.chairsCount ?? 1,
        phone: b.phone || "",
        createdAt: b.createdAt?.toISOString?.() || b.createdAt,
        coordinates: coords || [77.209, 28.6139],
      };
    });

    const users = rawUsers.map((u) => {
      let coords = u.location?.coordinates;
      if (!coords || !Array.isArray(coords) || coords.length !== 2) {
        coords = resolveCityCoordinates(u.city || u.address);
      }
      if (u.city) citiesSet.add(u.city);
      return {
        id: u._id.toString(),
        type: "user",
        name: u.name || "Customer",
        email: u.email || "",
        phone: u.phone || "",
        role: u.role || "user",
        active: u.active !== false,
        city: u.city || "Delhi NCR",
        address: u.address || "",
        createdAt: u.createdAt?.toISOString?.() || u.createdAt,
        coordinates: coords || [77.209, 28.6139],
      };
    });

    return Response.json({
      barbers,
      users,
      stats: {
        totalBarbers: barbers.length,
        totalUsers: users.length,
        verifiedBarbers: barbers.filter((b) => b.verificationStatus === "verified").length,
        pendingBarbers: barbers.filter((b) => b.verificationStatus === "pending").length,
        citiesCovered: citiesSet.size || 1,
      },
    });
  } catch (error) {
    return safeInternalError(error, "admin-map-data");
  }
}

