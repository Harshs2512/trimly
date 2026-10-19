import crypto from "crypto";
import { getFieldEncryptionKey } from "./env.js";

// In-memory media store for development and testing
const memoryMediaStore = new Map();

/**
 * Field-level AES-256-GCM encryption for sensitive fields (e.g. ID numbers).
 */
export function encryptField(plainText, keyHex = null) {
  if (!plainText) return plainText;
  const key = Buffer.from(keyHex || getFieldEncryptionKey(), "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(String(plainText), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `enc:v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Field-level AES-256-GCM decryption.
 */
export function decryptField(encryptedText, keyHex = null) {
  if (!encryptedText || typeof encryptedText !== "string" || !encryptedText.startsWith("enc:v1:")) {
    return encryptedText;
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 5) return encryptedText;

  const [, , ivHex, authTagHex, cipherHex] = parts;
  const key = Buffer.from(keyHex || getFieldEncryptionKey(), "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Validates image buffer using magic byte inspection (preventing file spoofing).
 */
export function sniffImageMimeType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF ... WEBP
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }

  return null;
}

/**
 * Strips EXIF and GPS metadata from JPEG buffers.
 */
export function stripExifFromJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  const chunks = [buffer.subarray(0, 2)]; // Keep SOI marker
  let pos = 2;

  while (pos < buffer.length) {
    if (buffer[pos] !== 0xff) break;
    const marker = buffer[pos + 1];

    // EOI (End of Image) or SOS (Start of Scan)
    if (marker === 0xd9 || marker === 0xda) {
      chunks.push(buffer.subarray(pos));
      break;
    }

    const length = buffer.readUInt16BE(pos + 2);
    // APP1 (EXIF / GPS) is 0xE1; APP2 is 0xE2
    if (marker === 0xe1) {
      // Skip APP1 EXIF segment
      pos += 2 + length;
    } else {
      chunks.push(buffer.subarray(pos, pos + 2 + length));
      pos += 2 + length;
    }
  }

  return Buffer.concat(chunks);
}

/**
 * Malware scan hook interface with default no-op pass.
 */
export async function scanForMalware(buffer) {
  // Plug in ClamAV / AWS GuardDuty / VirusTotal API here
  if (!buffer || buffer.length === 0) {
    return { safe: false, reason: "Empty file" };
  }
  return { safe: true };
}

/**
 * Cloud Storage Adapter: Supports S3/R2 or in-memory fallback.
 */
export class StorageService {
  constructor() {
    this.bucket = process.env.S3_BUCKET || "trimly-media";
    this.cdnUrl = (process.env.CDN_URL || "https://media.trimly.app").replace(/\/$/, "");
  }

  /**
   * Generates a pre-signed or direct upload URL.
   */
  async getUploadUrl({ key, contentType, maxSize = 5 * 1024 * 1024, isPrivate = false }) {
    const uploadId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");

    return {
      uploadUrl: `/api/mobile/v1/media/upload?key=${encodeURIComponent(key)}&token=${token}`,
      objectKey: key,
      maxSizeBytes: maxSize,
      contentType,
      isPrivate,
      uploadId,
    };
  }

  /**
   * Saves uploaded object.
   */
  async putObject({ key, buffer, contentType, isPrivate = false }) {
    memoryMediaStore.set(key, {
      buffer,
      contentType,
      isPrivate,
      size: buffer.length,
      createdAt: new Date(),
    });

    const publicUrl = isPrivate ? null : `${this.cdnUrl}/${key}`;
    return { key, publicUrl, size: buffer.length };
  }

  /**
   * Retrieves an object from storage.
   */
  async getObject({ key }) {
    const item = memoryMediaStore.get(key);
    if (!item) return null;
    return item;
  }

  /**
   * Generates a short-lived signed download URL for private documents (e.g. ID documents for admins).
   */
  getSignedDownloadUrl({ key, expiresInSeconds = 300 }) {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const hmac = crypto.createHmac("sha256", getFieldEncryptionKey());
    hmac.update(`${key}:${expires}`);
    const signature = hmac.digest("hex");

    return `/api/mobile/v1/media/private/${encodeURIComponent(key)}?exp=${expires}&sig=${signature}`;
  }

  /**
   * Verifies private document signature.
   */
  verifySignedDownloadUrl({ key, expires, signature }) {
    const now = Math.floor(Date.now() / 1000);
    if (parseInt(expires, 10) < now) return false;

    const hmac = crypto.createHmac("sha256", getFieldEncryptionKey());
    hmac.update(`${key}:${expires}`);
    const expected = hmac.digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  }
}

export const storage = new StorageService();
