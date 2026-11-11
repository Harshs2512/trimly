import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BLOG_IMAGES = [
  {
    fileName: "how-to-book-barber-online.webp",
    badge: "STEP-BY-STEP GUIDE",
    badgeColor: "#10b981",
    gradientFrom: "#064e3b",
    gradientTo: "#0f172a",
    accentColor: "#34d399",
    titleLine1: "How to Book a Barber",
    titleLine2: "Appointment Online in India",
    subtitle: "Skip the Weekend Queue • Real-Time Chair Slots • Instant Confirmation",
    tag1: "Live Slots",
    tag2: "Zero Wait Time",
    tag3: "Instant SMS",
  },
  {
    fileName: "best-salon-booking-apps-india.webp",
    badge: "2026 COMPARISON",
    badgeColor: "#6366f1",
    gradientFrom: "#1e1b4b",
    gradientTo: "#0f172a",
    accentColor: "#818cf8",
    titleLine1: "Top 10 Salon & Barber",
    titleLine2: "Booking Apps in India (2026)",
    subtitle: "Features, Transparent INR Pricing, Real-Time Availability & Verified Reviews",
    tag1: "App Comparison",
    tag2: "Best Salon Apps",
    tag3: "India 2026",
  },
  {
    fileName: "free-salon-management-software-india.webp",
    badge: "FOR SALON OWNERS",
    badgeColor: "#059669",
    gradientFrom: "#065f46",
    gradientTo: "#0f172a",
    accentColor: "#10b981",
    titleLine1: "Free Salon Management &",
    titleLine2: "Booking Software in India",
    subtitle: "Zero Monthly Subscription Fees • Phone Chair Calendar • Direct UPI Payouts",
    tag1: "Zero Monthly Fee",
    tag2: "Smart Chair Calendar",
    tag3: "Direct UPI",
  },
  {
    fileName: "haircut-beard-trim-prices-india.webp",
    badge: "RATE CARD & PRICING",
    badgeColor: "#f59e0b",
    gradientFrom: "#78350f",
    gradientTo: "#0f172a",
    accentColor: "#fbbf24",
    titleLine1: "Men's Haircut & Beard",
    titleLine2: "Trim Prices in India (2026)",
    subtitle: "Local Shop vs Premium Lounge Cost Breakdown Across Metro & Tier-2 Cities",
    tag1: "Transparent Rates",
    tag2: "City Price Guide",
    tag3: "No Hidden Costs",
  },
  {
    fileName: "best-barbers-salons-indore.webp",
    badge: "INDORE CITY GUIDE",
    badgeColor: "#a855f7",
    gradientFrom: "#581c87",
    gradientTo: "#0f172a",
    accentColor: "#c084fc",
    titleLine1: "Best Barbershops & Hair",
    titleLine2: "Salons in Indore (2026)",
    subtitle: "Top Grooming Lounges in Vijay Nagar, Palasia & Bhawarkua with Live Slots",
    tag1: "Vijay Nagar",
    tag2: "Palasia",
    tag3: "Bhawarkua",
  },
  {
    fileName: "top-barbershops-salons-bhopal.webp",
    badge: "BHOPAL CITY GUIDE",
    badgeColor: "#06b6d4",
    gradientFrom: "#155e75",
    gradientTo: "#0f172a",
    accentColor: "#38bdf8",
    titleLine1: "Top-Rated Barber Lounges",
    titleLine2: "& Hair Salons in Bhopal",
    subtitle: "Verified Master Stylists in MP Nagar, Arera Colony & Kolar Road",
    tag1: "MP Nagar",
    tag2: "Arera Colony",
    tag3: "Kolar Road",
  },
  {
    fileName: "30-day-grooming-checklist-indian-grooms.webp",
    badge: "WEDDING GROOMING",
    badgeColor: "#f43f5e",
    gradientFrom: "#881337",
    gradientTo: "#0f172a",
    accentColor: "#fb7185",
    titleLine1: "30-Day Grooming Checklist",
    titleLine2: "for Indian Grooms",
    subtitle: "Haircut Timing, Beard Sculpting, Skin Detox & Wedding Day Plan",
    tag1: "Dulha Grooming",
    tag2: "Skin & Hair",
    tag3: "30-Day Roadmap",
  },
  {
    fileName: "reduce-salon-no-shows-reminders.webp",
    badge: "SALON OPERATIONS",
    badgeColor: "#3b82f6",
    gradientFrom: "#1e3a8a",
    gradientTo: "#0f172a",
    accentColor: "#60a5fa",
    titleLine1: "How to Reduce Salon",
    titleLine2: "No-Shows by 85% in India",
    subtitle: "Automated SMS & WhatsApp Reminders • Chair Management for Barbers",
    tag1: "WhatsApp Alerts",
    tag2: "SMS Reminders",
    tag3: "Zero No-Shows",
  },
  {
    fileName: "trending-mens-haircuts-india.webp",
    badge: "STYLE GUIDE 2026",
    badgeColor: "#d97706",
    gradientFrom: "#451a03",
    gradientTo: "#0f172a",
    accentColor: "#f59e0b",
    titleLine1: "Top 7 Trending Men's",
    titleLine2: "Haircuts in India (2026)",
    subtitle: "Fade Styles, Undercuts, Taper Cuts & Textured Crops for Indian Hair Types",
    tag1: "Fades & Tapers",
    tag2: "Textured Crops",
    tag3: "Indian Hair",
  },
  {
    fileName: "salon-hygiene-sanitization-india.webp",
    badge: "SAFETY & HYGIENE",
    badgeColor: "#14b8a6",
    gradientFrom: "#134e4a",
    gradientTo: "#0f172a",
    accentColor: "#2dd4bf",
    titleLine1: "Salon Hygiene Standards:",
    titleLine2: "What to Check Before Haircut",
    subtitle: "Sterilization, Fresh Capes, Barber Razor Safety Protocols & Clean Lounges",
    tag1: "Tool Sterilization",
    tag2: "Fresh Disposables",
    tag3: "Clean Chairs",
  },
];

function escapeXml(unsafe = "") {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateSvg(item) {
  return `<svg width="1200" height="675" viewBox="0 0 1200 675" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1200" y2="675" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${item.gradientFrom}" />
      <stop offset="100%" stop-color="${item.gradientTo}" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${item.accentColor}" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.2" r="0.7">
      <stop offset="0%" stop-color="${item.accentColor}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${item.accentColor}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="675" fill="url(#bgGrad)" />
  <rect width="1200" height="675" fill="url(#glow)" />

  <!-- Subtle Grid Pattern Overlay -->
  <g opacity="0.06">
    <line x1="0" y1="75" x2="1200" y2="75" stroke="#ffffff" stroke-width="1"/>
    <line x1="0" y1="150" x2="1200" y2="150" stroke="#ffffff" stroke-width="1"/>
    <line x1="0" y1="225" x2="1200" y2="225" stroke="#ffffff" stroke-width="1"/>
    <line x1="0" y1="300" x2="1200" y2="300" stroke="#ffffff" stroke-width="1"/>
    <line x1="0" y1="375" x2="1200" y2="375" stroke="#ffffff" stroke-width="1"/>
    <line x1="0" y1="450" x2="1200" y2="450" stroke="#ffffff" stroke-width="1"/>
    <line x1="0" y1="525" x2="1200" y2="525" stroke="#ffffff" stroke-width="1"/>
    <line x1="0" y1="600" x2="1200" y2="600" stroke="#ffffff" stroke-width="1"/>
    <line x1="150" y1="0" x2="150" y2="675" stroke="#ffffff" stroke-width="1"/>
    <line x1="300" y1="0" x2="300" y2="675" stroke="#ffffff" stroke-width="1"/>
    <line x1="450" y1="0" x2="450" y2="675" stroke="#ffffff" stroke-width="1"/>
    <line x1="600" y1="0" x2="600" y2="675" stroke="#ffffff" stroke-width="1"/>
    <line x1="750" y1="0" x2="750" y2="675" stroke="#ffffff" stroke-width="1"/>
    <line x1="900" y1="0" x2="900" y2="675" stroke="#ffffff" stroke-width="1"/>
    <line x1="1050" y1="0" x2="1050" y2="675" stroke="#ffffff" stroke-width="1"/>
  </g>

  <!-- Outer Card Frame -->
  <rect x="50" y="50" width="1100" height="575" rx="28" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" fill="none" />

  <!-- Brand Bar Top -->
  <g transform="translate(90, 105)">
    <!-- Scissors / Trimlly Icon -->
    <rect x="0" y="0" width="38" height="38" rx="10" fill="${item.accentColor}" fill-opacity="0.2" stroke="${item.accentColor}" stroke-opacity="0.4" stroke-width="1.5"/>
    <text x="19" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="900" fill="${item.accentColor}" text-anchor="middle">✂</text>

    <!-- Brand Name -->
    <text x="52" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="900" letter-spacing="1.5" fill="#ffffff">TRIMLLY</text>
    <text x="145" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="2" fill="#94a3b8">GROOMING JOURNAL</text>
    
    <!-- Badge -->
    <rect x="740" y="2" width="180" height="32" rx="16" fill="${item.badgeColor}" fill-opacity="0.25" stroke="${item.badgeColor}" stroke-width="1.5" />
    <text x="830" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="800" letter-spacing="1.2" fill="${item.accentColor}" text-anchor="middle">${escapeXml(item.badge)}</text>
  </g>

  <!-- Horizontal divider -->
  <line x1="90" y1="170" x2="1110" y2="170" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />

  <!-- Main Title Area -->
  <g transform="translate(90, 260)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-1">
      ${escapeXml(item.titleLine1)}
    </text>
    <text x="0" y="66" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="900" fill="url(#accentGrad)" letter-spacing="-1">
      ${escapeXml(item.titleLine2)}
    </text>
  </g>

  <!-- Subtitle -->
  <g transform="translate(90, 420)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="500" fill="#cbd5e1" letter-spacing="0.2">
      ${escapeXml(item.subtitle)}
    </text>
  </g>

  <!-- Footer Tag Pills -->
  <g transform="translate(90, 520)">
    <!-- Pill 1 -->
    <rect x="0" y="0" width="160" height="42" rx="21" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />
    <circle cx="22" cy="21" r="5" fill="${item.accentColor}" />
    <text x="36" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">${escapeXml(item.tag1)}</text>

    <!-- Pill 2 -->
    <rect x="180" y="0" width="170" height="42" rx="21" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />
    <circle cx="202" cy="21" r="5" fill="${item.accentColor}" />
    <text x="216" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">${escapeXml(item.tag2)}</text>

    <!-- Pill 3 -->
    <rect x="370" y="0" width="160" height="42" rx="21" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />
    <circle cx="392" cy="21" r="5" fill="${item.accentColor}" />
    <text x="406" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">${escapeXml(item.tag3)}</text>

    <!-- Domain Stamp -->
    <text x="1010" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#94a3b8" text-anchor="end">trimlly.solvantis.in</text>
  </g>
</svg>`;
}

async function run() {
  const outDir = path.resolve(process.cwd(), "public/images/blog");
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating 10 custom blog cover images into ${outDir}...`);

  for (const item of BLOG_IMAGES) {
    const svgContent = generateSvg(item);
    const dest = path.join(outDir, item.fileName);
    await sharp(Buffer.from(svgContent))
      .webp({ quality: 90, effort: 4 })
      .toFile(dest);
    console.log(`✓ Generated ${item.fileName}`);
  }

  console.log("All 10 blog images successfully generated!");
}

run().catch((err) => {
  console.error("Failed to generate blog images:", err);
  process.exit(1);
});

