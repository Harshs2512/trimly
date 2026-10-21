import { MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";
import { resolveCityCoordinates } from "../src/lib/geo.js";

// Load environment variables
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
console.log("Trimly Barber Geographic Coordinates Backfill");
console.log(`Mode: ${isDryRun ? "DRY-RUN (No database writes)" : "COMMIT (Active database mutations)"}`);
console.log("==================================================");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "trimly";

if (!uri) {
  console.error("MONGODB_URI is required.");
  process.exit(1);
}

const client = new MongoClient(uri);

async function backfill() {
  await client.connect();
  const db = client.db(dbName);
  const barbersCol = db.collection("barbers");

  const cursor = barbersCol.find({
    $or: [
      { location: { $exists: false } },
      { "location.coordinates": { $exists: false } },
    ],
  });

  let scanned = 0;
  let backfilled = 0;

  while (await cursor.hasNext()) {
    const barber = await cursor.next();
    scanned++;

    const coords = resolveCityCoordinates(barber.city || barber.address);
    if (coords) {
      backfilled++;
      if (!isDryRun) {
        await barbersCol.updateOne(
          { _id: barber._id },
          {
            $set: {
              location: {
                type: "Point",
                coordinates: coords,
              },
              updatedAt: new Date(),
            },
          }
        );
      }
    }
  }

  console.log("\n--- Geo Backfill Execution Report ---");
  console.log(`Barbers Without Coordinates: ${scanned}`);
  console.log(`Coordinates Resolved:        ${backfilled}`);
  console.log("-------------------------------------\n");

  if (isDryRun) {
    console.log("Dry-run complete. No database changes were made.");
    console.log("To apply changes, run: node scripts/backfill-geo.mjs --commit");
  } else {
    console.log("Backfill completed and committed to MongoDB.");
  }
}

backfill()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
