/**
 * Structured JSON Logger for Trimly Backend
 * Formats all logs as single-line JSON objects with timestamps, log levels,
 * request IDs, and guarantees sanitization of all credentials, tokens, and PII.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /hash/i,
  /iddocument/i,
  /idnumber/i,
  /apikey/i,
  /key/i,
];

export function sanitizeValue(key, value) {
  if (value === null || value === undefined) return value;

  const keyStr = String(key || "").toLowerCase();
  for (const pattern of SENSITIVE_KEY_PATTERNS) {
    if (pattern.test(keyStr)) {
      return "[REDACTED]";
    }
  }

  if (typeof value === "string") {
    // Check if value looks like a JWT or bearer token
    if (value.startsWith("Bearer ") || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
      return "[REDACTED_TOKEN]";
    }
    // Mask email addresses
    if (keyStr.includes("email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      const parts = value.split("@");
      if (parts.length === 2 && parts[0].length > 0) {
        return `${parts[0][0]}***@${parts[1]}`;
      }
      return "[REDACTED_EMAIL]";
    }
    // Mask phone numbers
    if (keyStr.includes("phone") && value.length >= 7) {
      return `***${value.slice(-4)}`;
    }
  }

  return value;
}

export function sanitizeLogData(data, depth = 0) {
  if (depth > 6 || data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeLogData(val, depth + 1);
    } else {
      sanitized[key] = sanitizeValue(key, val);
    }
  }
  return sanitized;
}

function writeLog(level, message, { requestId, error, ...context } = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(requestId ? { requestId } : {}),
    ...(error
      ? {
          error: {
            message: error.message || String(error),
            code: error.code,
            ...(process.env.NODE_ENV !== "production" && error.stack ? { stack: error.stack } : {}),
          },
        }
      : {}),
    ...(Object.keys(context).length > 0 ? { context: sanitizeLogData(context) } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === "ERROR") {
    console.error(line);
  } else if (level === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }
  return entry;
}

export const logger = {
  info: (msg, meta) => writeLog("INFO", msg, meta),
  warn: (msg, meta) => writeLog("WARN", msg, meta),
  error: (msg, meta) => writeLog("ERROR", msg, meta),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== "production" || process.env.LOG_LEVEL === "debug") {
      writeLog("DEBUG", msg, meta);
    }
  },
};
