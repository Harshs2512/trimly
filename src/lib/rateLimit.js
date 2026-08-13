// Simple in-memory sliding window rate limiter
const tracker = new Map();

export function rateLimit(ip, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = tracker.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  tracker.set(ip, record);

  return record.count <= limit;
}
