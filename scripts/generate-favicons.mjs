import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

async function generateFavicons() {
  const inputPath = path.resolve("public/logo.png");
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Base logo not found at ${inputPath}`);
  }

  console.log("Generating square favicons & mobile app icons from:", inputPath);

  // 1. Create a perfectly square 512x512 base with transparent background and balanced padding
  // Google requires multiples of 48px square (48, 96, 144, 192, 512)
  const base512 = await sharp(inputPath)
    .resize(440, 440, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 36,
      bottom: 36,
      left: 36,
      right: 36,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Save 512x512 PNGs
  fs.writeFileSync("public/icon-512.png", base512);
  fs.writeFileSync("public/icon.png", base512);
  fs.writeFileSync("src/app/icon.png", base512);

  // 2. Generate 192x192 (standard Android/PWA & Google 48-multiple)
  const buf192 = await sharp(base512).resize(192, 192).png().toBuffer();
  fs.writeFileSync("public/icon-192.png", buf192);

  // 3. Generate 180x180 (Apple touch icon)
  const buf180 = await sharp(base512).resize(180, 180).png().toBuffer();
  fs.writeFileSync("public/apple-touch-icon.png", buf180);
  fs.writeFileSync("src/app/apple-icon.png", buf180);

  // 4. Generate 96x96 and 48x48
  const buf96 = await sharp(base512).resize(96, 96).png().toBuffer();
  fs.writeFileSync("public/icon-96.png", buf96);
  const buf48 = await sharp(base512).resize(48, 48).png().toBuffer();
  fs.writeFileSync("public/icon-48.png", buf48);

  // 5. Generate a true multi-resolution .ico containing 16x16, 32x32, 48x48
  const icoSizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    icoSizes.map((s) => sharp(base512).resize(s, s).png().toBuffer())
  );

  const count = icoSizes.length;
  const headerLen = 6 + count * 16;
  let currentOffset = headerLen;

  const dirEntries = [];
  for (let i = 0; i < count; i++) {
    const s = icoSizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s === 256 ? 0 : s, 0); // width
    entry.writeUInt8(s === 256 ? 0 : s, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buf.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset
    dirEntries.push(entry);
    currentOffset += buf.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
  fs.writeFileSync("public/favicon.ico", icoBuffer);
  fs.writeFileSync("src/app/favicon.ico", icoBuffer);

  console.log("✅ Successfully generated all square favicons and icons.");
}

generateFavicons().catch((err) => {
  console.error("❌ Failed to generate favicons:", err);
  process.exit(1);
});

