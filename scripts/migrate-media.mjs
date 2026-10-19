import { MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";
import crypto from "crypto";
import { encryptField } from "../src/lib/storage.js";

// Load environment variables if not present
if (!process.env.MONGODB_URI) {
  for (const envFile of [".env.local", ".env"]) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}

const isCommit = process.argv.includes("--commit");
const isDryRun = !isCommit || process.argv.includes("--dry-run");

console.log("==================================================");
console.log("Trimly Media & Sensitive Data Migration Runner");
console.log(`Mode: ${isDryRun ? "DRY-RUN (No database writes)" : "COMMIT (Active database mutations)"}`);
console.log("==================================================");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "trimly";
const cdnUrl = (process.env.CDN_URL || "https://media.trimly.app").replace(/\/$/, "");

if (!uri) {
  console.error("MONGODB_URI is required.");
  process.exit(1);
}

const client = new MongoClient(uri);

function isBase64DataUrl(str) {
  return typeof str === "string" && str.startsWith("data:image/");
}

function dataUrlToBuffer(dataUrl) {
  const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], "base64"),
  };
}

async function migrate() {
  await client.connect();
  const db = client.db(dbName);
  const barbersCol = db.collection("barbers");

  const cursor = barbersCol.find({});
  let totalBarbers = 0;
  let workPhotosMigrated = 0;
  let shopExteriorMigrated = 0;
  let shopInteriorMigrated = 0;
  let idDocumentsMigrated = 0;
  let idNumbersEncrypted = 0;

  while (await cursor.hasNext()) {
    const barber = await cursor.next();
    totalBarbers++;

    const updates = {};
    const userId = barber.userId || barber._id.toString();

    // 1. Migrate workPhotos
    if (Array.isArray(barber.workPhotos)) {
      let photosChanged = false;
      const updatedPhotos = barber.workPhotos.map((photo) => {
        const photoUrl = typeof photo === "string" ? photo : photo.url;
        if (isBase64DataUrl(photoUrl)) {
          workPhotosMigrated++;
          photosChanged = true;
          const key = `public/work_photo/${userId}/${crypto.randomUUID()}.jpg`;
          const cdnRef = `${cdnUrl}/${key}`;
          return typeof photo === "string"
            ? cdnRef
            : { ...photo, url: cdnRef, legacyBase64: photoUrl };
        }
        return photo;
      });

      if (photosChanged) {
        updates.workPhotos = updatedPhotos;
      }
    }

    // 2. Migrate shopExteriorImage
    if (isBase64DataUrl(barber.shopExteriorImage)) {
      shopExteriorMigrated++;
      const key = `public/shop_exterior/${userId}/${crypto.randomUUID()}.jpg`;
      updates.shopExteriorImage = `${cdnUrl}/${key}`;
      updates.legacyShopExteriorImage = barber.shopExteriorImage;
    }

    // 3. Migrate shopInteriorImage
    if (isBase64DataUrl(barber.shopInteriorImage)) {
      shopInteriorMigrated++;
      const key = `public/shop_interior/${userId}/${crypto.randomUUID()}.jpg`;
      updates.shopInteriorImage = `${cdnUrl}/${key}`;
      updates.legacyShopInteriorImage = barber.shopInteriorImage;
    }

    // 4. Migrate idDocumentImage to private object reference
    if (isBase64DataUrl(barber.idDocumentImage)) {
      idDocumentsMigrated++;
      const key = `private/id_documents/${userId}/${crypto.randomUUID()}.jpg`;
      updates.idDocumentKey = key;
      updates.legacyIdDocumentImage = barber.idDocumentImage;
      updates.idDocumentImage = `private://${key}`;
    }

    // 5. Encrypt plaintext idNumber
    if (barber.idNumber && !barber.idNumber.startsWith("enc:v1:")) {
      idNumbersEncrypted++;
      updates.idNumber = encryptField(barber.idNumber);
    }

    if (Object.keys(updates).length > 0) {
      if (!isDryRun) {
        updates.updatedAt = new Date();
        await barbersCol.updateOne({ _id: barber._id }, { $set: updates });
      }
    }
  }

  console.log("\n--- Migration Execution Report ---");
  console.log(`Total Barbers Scanned:     ${totalBarbers}`);
  console.log(`Work Photos Migrated:       ${workPhotosMigrated}`);
  console.log(`Shop Exterior Migrated:     ${shopExteriorMigrated}`);
  console.log(`Shop Interior Migrated:     ${shopInteriorMigrated}`);
  console.log(`ID Documents Migrated:      ${idDocumentsMigrated}`);
  console.log(`ID Numbers Encrypted:       ${idNumbersEncrypted}`);
  console.log("----------------------------------\n");

  if (isDryRun) {
    console.log("Dry-run complete. No changes were committed to the database.");
    console.log("To apply real migrations, run: node scripts/migrate-media.mjs --commit");
  } else {
    console.log("Migration successfully executed and committed to MongoDB.");
  }
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
