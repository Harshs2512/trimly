import sharp from "sharp";
import fs from "fs";

async function optimize() {
  console.log("Optimizing images with sharp...");

  // 1. Hero image: 193 KB -> WebP
  await sharp("public/images/hero-salon.jpg")
    .webp({ quality: 82 })
    .toFile("public/images/hero-salon.webp");
  const heroSize = fs.statSync("public/images/hero-salon.webp").size;
  console.log("hero-salon.webp:", Math.round(heroSize / 1024), "KB");

  // 2. Auth background: 841 KB -> WebP
  await sharp("public/auth-bg.png")
    .webp({ quality: 80 })
    .toFile("public/auth-bg.webp");
  const authSize = fs.statSync("public/auth-bg.webp").size;
  console.log("auth-bg.webp:", Math.round(authSize / 1024), "KB");

  // 3. Logo: 220 KB -> WebP
  await sharp("public/logo.png")
    .webp({ quality: 90 })
    .toFile("public/logo.webp");
  const logoSize = fs.statSync("public/logo.webp").size;
  console.log("logo.webp:", Math.round(logoSize / 1024), "KB");

  // 4. Create proper OG Image (1200x630) for social previews & Google Discover
  const svgOverlay = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0a" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#111827" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#grad)" />
      <text x="80" y="240" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="72" font-weight="800" fill="#ffffff" letter-spacing="2">TRIMLY</text>
      <text x="80" y="320" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="34" font-weight="700" fill="#10b981">Book Barber &amp; Salon Appointments Online in India</text>
      <text x="80" y="380" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="22" fill="#9ca3af">Real-Time Slots • Verified Lounges • Pay in INR • Zero Wait Times</text>
      <rect x="80" y="440" width="240" height="52" rx="16" fill="#10b981"/>
      <text x="120" y="474" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="700" fill="#000000">Book Online &#8594;</text>
    </svg>
  `);

  await sharp("public/images/hero-salon.jpg")
    .resize(1200, 630, { fit: "cover", position: "center" })
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toFile("public/og-image.jpg");

  const ogSize = fs.statSync("public/og-image.jpg").size;
  console.log("og-image.jpg (1200x630):", Math.round(ogSize / 1024), "KB");
  console.log("All image optimizations complete!");
}

optimize().catch(console.error);
