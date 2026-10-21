import { getRequestId, mobileSuccess } from "@/lib/mobileResponse";

export const dynamic = "force-dynamic";

/**
 * Mobile v1 Dedicated Test Endpoint
 * Endpoint: /api/mobile/v1/test
 * Follows Trimly Mobile response specification: { data, meta, requestId }
 */
export async function GET(request) {
  const requestId = getRequestId(request);
  const platform = request.headers.get("x-client-platform") || "mobile";

  return mobileSuccess(
    {
      message: "Mobile v1 API Gateway is reachable and verified",
      status: "healthy",
      platform,
      serverTime: new Date().toISOString(),
      apiVersion: "1.0.0",
    },
    {
      requestId,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

export async function POST(request) {
  const requestId = getRequestId(request);
  const body = await request.json().catch(() => ({}));

  return mobileSuccess(
    {
      message: "Mobile POST echo successful",
      echo: body,
      receivedAt: new Date().toISOString(),
    },
    {
      requestId,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
