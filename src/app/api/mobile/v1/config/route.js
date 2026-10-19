import { APP_CONFIG, getRequestId, mobileSuccess } from "@/lib/mobileResponse";

export async function GET(request) {
  const requestId = getRequestId(request);
  return mobileSuccess(APP_CONFIG, {
    requestId,
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
