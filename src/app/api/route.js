import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * Universal Test API for Web & Mobile clients
 * Endpoint: /api
 */
export async function GET(request) {
  const startTime = Date.now();
  const userAgent = request.headers.get("user-agent") || "unknown";
  const clientPlatform =
    request.headers.get("x-client-platform") ||
    (/mobile|iphone|android|ipad/i.test(userAgent) ? "mobile" : "web");

  let dbStatus = "disconnected";
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    dbStatus = "connected";
  } catch (err) {
    dbStatus = `offline (${err.message})`;
  }

  const responseTime = `${Date.now() - startTime}ms`;

  return NextResponse.json(
    {
      status: "success",
      message: "Trimly API is live and operational",
      timestamp: new Date().toISOString(),
      latency: responseTime,
      client: {
        platform: clientPlatform,
        userAgent,
        ip:
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "127.0.0.1",
      },
      database: {
        status: dbStatus,
      },
      availableEndpoints: {
        web: ["/api/auth", "/api/barbers", "/api/bookings", "/api/reviews"],
        mobile: [
          "/api/mobile/v1/test",
          "/api/mobile/v1/config",
          "/api/mobile/v1/auth/login",
          "/api/mobile/v1/barbers",
          "/api/mobile/v1/bookings",
        ],
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-platform, x-request-id",
      },
    }
  );
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(
      {
        status: "success",
        message: "POST test request received successfully",
        echo: body,
        receivedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-platform, x-request-id",
    },
  });
}
