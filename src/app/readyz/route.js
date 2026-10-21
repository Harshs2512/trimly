import { getDb } from "../../lib/mongodb.js";

export async function GET() {
  try {
    const db = await getDb();
    // Verify MongoDB connectivity without exposing internal topology details
    await db.command({ ping: 1 });

    return Response.json(
      {
        status: "ready",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Content-Type": "application/json",
        },
      }
    );
  } catch {
    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Content-Type": "application/json",
        },
      }
    );
  }
}
