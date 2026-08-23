import crypto from "crypto";

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}
