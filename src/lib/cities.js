import { getDb } from "./mongodb.js";
import { escapeRegex } from "./api.js";

export function slugifyCity(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export const CANONICAL_CITIES = {
  indore: {
    slug: "indore",
    name: "Indore",
    state: "Madhya Pradesh",
    popularAreas: ["Vijay Nagar", "Palasia", "Chappan Dukan", "Bhawarkua", "Scheme 54"],
    aliases: ["indore"],
    intro:
      "Indore's bustling lifestyle demands grooming that fits busy schedules. From classic fades in Vijay Nagar to modern beard sculpting in Palasia, discover verified salons with guaranteed available slots and zero waiting.",
  },
  bhopal: {
    slug: "bhopal",
    name: "Bhopal",
    state: "Madhya Pradesh",
    popularAreas: ["Arera Colony", "10 No. Market", "MP Nagar", "Kolar Road", "Bittan Market"],
    aliases: ["bhopal"],
    intro:
      "Explore Bhopal's top master barbershops and artisan grooming lounges. Check live wait times, transparent INR pricing, and book confirmed appointments near Arera Colony and MP Nagar.",
  },
  mumbai: {
    slug: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    popularAreas: ["Bandra West", "Juhu", "Andheri", "Colaba", "Powai"],
    aliases: ["mumbai", "bombay", "navi mumbai", "thane"],
    intro:
      "Experience premier grooming lounges across Mumbai. Skip the weekend salon queues with confirmed appointment booking in Bandra, Juhu, and South Mumbai.",
  },
  delhi: {
    slug: "delhi",
    name: "Delhi NCR",
    state: "Delhi",
    popularAreas: ["Connaught Place", "South Extension", "Hauz Khas", "Saket", "Gurugram Cyber Hub"],
    aliases: ["delhi", "delhi ncr", "delhi-ncr", "new delhi", "noida", "gurgaon", "gurugram", "faridabad", "ghaziabad"],
    intro:
      "From heritage barber lounges in Connaught Place to luxury grooming studios in South Delhi and Gurugram, book verified master stylists with real-time slot availability.",
  },
  bengaluru: {
    slug: "bengaluru",
    name: "Bengaluru",
    state: "Karnataka",
    popularAreas: ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "JP Nagar"],
    aliases: ["bengaluru", "bangalore"],
    intro:
      "Bangalore's tech and startup professionals trust Trimlly to avoid long weekend wait times. Find top-rated styling chairs in Indiranagar, Koramangala, and HSR Layout.",
  },
  pune: {
    slug: "pune",
    name: "Pune",
    state: "Maharashtra",
    popularAreas: ["Koregaon Park", "Baner", "Viman Nagar", "Kothrud", "Aundh"],
    aliases: ["pune", "poona"],
    intro:
      "Discover modern barber lounges and verified salons across Pune. Reserve instant appointment slots in Koregaon Park and Baner with confirmed pricing in INR.",
  },
  hyderabad: {
    slug: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    popularAreas: ["Banjara Hills", "Jubilee Hills", "Hitec City", "Gachibowli", "Madhapur"],
    aliases: ["hyderabad", "secunderabad"],
    intro:
      "Find verified premium barbershops and grooming lounges in Hyderabad. Skip the queue with live slot booking in Banjara Hills and Hitec City.",
  },
  ahmedabad: {
    slug: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    popularAreas: ["Bodakdev", "Satellite", "SG Highway", "Navrangpura", "Vastrapur"],
    aliases: ["ahmedabad", "amdavad"],
    intro:
      "Book top-rated artisan hair salons and master barbers across Ahmedabad with instant real-time confirmation.",
  },
  jaipur: {
    slug: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    popularAreas: ["C-Scheme", "Malviya Nagar", "Vaishali Nagar", "Raja Park"],
    aliases: ["jaipur"],
    intro:
      "Experience royal grooming and precision cuts in Jaipur. Reserve confirmed chair appointments with upfront pricing.",
  },
};

/**
 * Normalizes any city input (slug, display name, or alias) to canonical city info.
 */
export function resolveCity(input = "") {
  const raw = String(input).trim();
  if (!raw) {
    return {
      slug: "india",
      name: "All India",
      state: "India",
      popularAreas: [],
      aliases: [],
      intro: "Browse verified barbers and salons across India.",
    };
  }

  const slug = slugifyCity(raw);

  // 1. Exact match by slug
  if (CANONICAL_CITIES[slug]) {
    return CANONICAL_CITIES[slug];
  }

  // 2. Match by alias
  const lower = raw.toLowerCase();
  for (const city of Object.values(CANONICAL_CITIES)) {
    if (city.aliases.some((alias) => alias.toLowerCase() === lower || slugifyCity(alias) === slug)) {
      return city;
    }
  }

  // 3. Fallback for unlisted Indian cities
  const formattedName = raw.charAt(0).toUpperCase() + raw.slice(1);
  return {
    slug,
    name: formattedName,
    state: "India",
    popularAreas: ["Central", "North", "South"],
    aliases: [raw.toLowerCase()],
    intro: `Find and book verified barbershops and grooming lounges in ${formattedName}. Check real-time availability and book online.`,
  };
}

/**
 * Builds the MongoDB query condition for matching a city, accounting for
 * variations like "Delhi", "Delhi NCR", "New Delhi", etc.
 */
export function buildCityMongoQuery(cityParam = "") {
  if (!cityParam) return {};
  const cityInfo = resolveCity(cityParam);
  const terms = Array.from(new Set([cityInfo.slug, cityInfo.name.toLowerCase(), ...(cityInfo.aliases || [])]))
    .map((t) => t.trim())
    .filter(Boolean);

  const escapedPatterns = terms.map(escapeRegex);
  const regex = new RegExp(`^(${escapedPatterns.join("|")})$`, "i");

  return { city: { $regex: regex } };
}

/**
 * Returns a standardized, verified salon count for any city input.
 * Guarantees that homepage, directory headers, and city pages show
 * the EXACT same database count.
 */
export async function getCitySalonCount(cityParam = "") {
  const db = await getDb();
  const cityQuery = buildCityMongoQuery(cityParam);

  return db.collection("barbers").countDocuments({
    deletedAt: { $exists: false },
    verificationStatus: "verified",
    ...cityQuery,
  });
}

/**
 * Unified, single-source aggregator for all city salon counts.
 * Returns consistent counts mapped by canonical slug and display name.
 */
export async function getUnifiedCityStats() {
  const db = await getDb();

  // Fetch all active verified barbers with city
  const barbers = await db
    .collection("barbers")
    .find(
      {
        deletedAt: { $exists: false },
        verificationStatus: "verified",
        city: { $exists: true, $ne: "" },
      },
      { projection: { city: 1, updatedAt: 1, createdAt: 1 } }
    )
    .toArray();

  const cityMap = {};

  // Initialize all canonical launch cities with 0 count
  for (const [slug, city] of Object.entries(CANONICAL_CITIES)) {
    cityMap[slug] = {
      citySlug: slug,
      cityName: city.name,
      state: city.state,
      count: 0,
      latestUpdate: null,
    };
  }

  // Distribute real verified barbers to canonical cities
  for (const b of barbers) {
    const resolved = resolveCity(b.city);
    const slug = resolved.slug;

    if (!cityMap[slug]) {
      cityMap[slug] = {
        citySlug: slug,
        cityName: resolved.name,
        state: resolved.state,
        count: 0,
        latestUpdate: null,
      };
    }

    cityMap[slug].count += 1;
    const bDate = b.updatedAt ? new Date(b.updatedAt) : b.createdAt ? new Date(b.createdAt) : null;
    if (bDate) {
      if (!cityMap[slug].latestUpdate || bDate > cityMap[slug].latestUpdate) {
        cityMap[slug].latestUpdate = bDate;
      }
    }
  }

  // Return sorted: cities with inventory first, then alphabetical
  return Object.values(cityMap).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.cityName.localeCompare(b.cityName);
  });
}
