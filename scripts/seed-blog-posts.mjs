import { MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";

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

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "trimly";

if (!uri) {
  console.error("MONGODB_URI required.");
  process.exit(1);
}

const client = new MongoClient(uri);

const DRAFT_POSTS = [
  {
    slug: "mens-haircut-prices-india-salon-vs-barber",
    title: "Men's Haircut Prices in India (2026): Salon vs Barber Shop Cost Breakdown",
    excerpt:
      "A complete price comparison of men's haircuts across metro and Tier-2 Indian cities. From neighborhood saloons to luxury grooming lounges, understand average INR rates and what you actually pay for.",
    category: "Hair Care",
    tags: ["haircut price", "india salon cost", "barber rates inr", "delhi mumbai indore"],
    author: {
      name: "Aman Sharma",
      role: "Senior Master Barber & Grooming Consultant",
      avatar: null,
    },
    status: "draft",
    readingTime: "5 min read",
    seoTitle: "Men's Haircut Prices in India (2026): Salon Cost Breakdown",
    seoDescription:
      "Comprehensive breakdown of men's haircut prices across Indian cities. Compare local barber shops vs premium salon lounges and see transparent INR rates.",
    coverImage: "/images/hero-salon.webp",
    faq: [
      {
        question: "How much does a basic men's haircut cost in India?",
        answer:
          "In 2026, a basic men's haircut in local Indian neighborhood shops costs ₹80 to ₹200. Established salon chains range from ₹350 to ₹900, while bespoke boutique grooming lounges charge ₹1,000 to ₹2,500.",
      },
      {
        question: "Do haircut prices vary significantly between Indian cities?",
        answer:
          "Yes. Metro hubs like Mumbai, Bengaluru, and South Delhi average 30-50% higher salon rates compared to vibrant Tier-2 cities like Indore, Bhopal, Jaipur, and Chandigarh.",
      },
      {
        question: "Should I book an appointment in advance for a haircut in India?",
        answer:
          "Yes. Booking through platforms like Trimly guarantees your chair slot and eliminates 30-60 minute wait times during busy evening and weekend rush hours.",
      },
    ],
    content: `# Men's Haircut Prices in India (2026): Salon vs Barber Shop Cost Breakdown

Getting a haircut in India spans an extraordinary spectrum: from the humble corner saloon where a skilled ustaad gives you a clean trim for ₹100, to air-conditioned unisex lounges charging upwards of ₹1,500 with complimentary espresso.

Whether you are looking for an affordable routine taper or a precision drop fade, understanding the realistic cost landscape across Indian cities helps you make the right choice without paying arbitrary markups.

---

## 1. Overview of Price Tiers Across India

| Salon Category | Typical Price Range (INR) | What is Included | Best Suited For |
|---|---|---|---|
| **Local Neighborhood Shop** | ₹80 - ₹200 | Quick machine or scissor trim, basic neck shave | Fast maintenance, routine monthly cleanups |
| **Mid-Tier Modern Salon** | ₹250 - ₹600 | Consultation, hair wash, cut, simple styling | Professional everyday styling, taper fades |
| **Premium Grooming Lounge** | ₹700 - ₹1,800+ | Master stylist consultation, scalp massage, hot towel, styling products | Textured crops, creative fades, special occasions |

---

## 2. City-by-City Price Comparison

### Tier 1 Metros (Mumbai, Delhi-NCR, Bengaluru)
- **Basic Cut:** ₹150 - ₹300
- **Standard Salon Cut:** ₹450 - ₹900
- **Stylist / Creative Director:** ₹1,200 - ₹2,500

Higher real estate costs and brand premiums reflect in metro rates, particularly in neighborhoods like Bandra, Indiranagar, or South Extension.

### Tier 2 Cities (Indore, Bhopal, Pune, Ahmedabad, Lucknow)
- **Basic Cut:** ₹80 - ₹150
- **Standard Salon Cut:** ₹250 - ₹500
- **Premium Barber Lounge:** ₹600 - ₹1,200

In emerging grooming hubs like Indore (Vijay Nagar, Palasia) and Bhopal (MP Nagar, Arera Colony), modern male grooming lounges offer high-end service at significantly lower overhead costs.

---

## 3. What Actually Justifies Higher Haircut Prices?

1. **Hygiene & Sterilization:** Disposable neck strips, UV-sterilized clippers, fresh razor blades per client, and sanitized hot towels.
2. **Stylist Experience:** Stylists who understand diverse Indian hair textures (thick wavy hair, straight silk hair, receding hairlines).
3. **Dedicated Time Window:** Lower-cost shops survive on speed (10-15 minutes). Premium appointments reserve 30 to 45 minutes of undivided chair attention.
4. **Zero Wait Time:** Platforms like [Trimly](/barbers) lock your slot so you never sit in a cramped waiting chair.

---

## Conclusion

A great haircut is an investment in your personal confidence. Compare local ratings, check transparent INR rate cards upfront on Trimly, and book your verified slot today.`,
  },
  {
    slug: "beard-styles-indian-face-shapes-guide",
    title: "How to Choose the Best Beard Style for Your Face Shape: Complete Indian Men's Guide",
    excerpt:
      "Discover the most flattering beard cuts for round, oval, square, and rectangular Indian face shapes. Expert trimming guidelines and salon maintenance routines.",
    category: "Beard Styling",
    tags: ["beard style", "indian men beard", "face shape beard", "beard trimming"],
    author: {
      name: "Rohit Verma",
      role: "Master Barber & Beard Artist",
      avatar: null,
    },
    status: "draft",
    readingTime: "6 min read",
    seoTitle: "Best Beard Styles for Indian Face Shapes: Complete Guide",
    seoDescription:
      "Find the ideal beard style for round, square, oval, or rectangular Indian face shapes. Expert barber trimming and conditioning advice.",
    coverImage: "/images/hero-salon.webp",
    faq: [
      {
        question: "Which beard style is best for a round face in India?",
        answer:
          "A pointed goatee, boxed beard, or ducktail with closely clipped cheeks and extra length at the chin elongates a round face and sharpens the jawline.",
      },
      {
        question: "How often should I get my beard trimmed professionally?",
        answer:
          "Most Indian men maintain sharp edges with a professional barber trim every 2 to 3 weeks, combined with light at-home cheek line maintenance.",
      },
    ],
    content: `# How to Choose the Best Beard Style for Your Face Shape: Complete Indian Men's Guide

A well-groomed beard is one of the most powerful style statements an Indian man can make. However, copying a celebrity beard style without considering your natural facial structure often leads to disappointing results.

Your face shape dictates how beard volume should be distributed to create balance, sharpen your jawline, and highlight your best features.

---

## 1. Determining Your Face Shape

Before reaching for the trimmer, stand in front of a mirror and examine the relationship between your forehead, cheekbones, and jawline:
- **Round Face:** Cheekbones and face length have a similar measurement; soft rounded jaw.
- **Square Face:** Wide forehead, angular cheekbones, and a sharp, pronounced jawline.
- **Oval Face:** Face length is greater than the cheekbones, with gently rounded contours.
- **Oblong / Rectangular:** Long vertical profile with similar width across forehead and jaw.

---

## 2. Recommended Beard Cuts by Shape

### A. Round Face: Create Vertical Length
- **Recommended Styles:** Pointed goatee, Van Dyke, short boxed beard with faded cheeks.
- **What to Avoid:** Bushy sideburns and thick cheek hair that add roundness.
- **Barber Tip:** Ask your stylist to trim the cheeks at a #1 or #2 guard and taper into a dense, shaped chin.

### B. Square Face: Soften Sharp Angles
- **Recommended Styles:** Rounded corporate beard, heavy stubble (3-5mm), circle beard.
- **What to Avoid:** Excessively sharp geometric cheek borders that create an aggressive box look.

### C. Oval Face: The Universal Canvas
- **Recommended Styles:** Full beard, classic stubble, tailored short beard.
- **Barber Tip:** Oval face shapes can pull off almost any style. Focus on keeping cheek lines crisp and neckline clean.

---

## 3. Beard Care in Indian Weather

Indian summers and monsoons pose unique challenges for beard hygiene:
1. **Wash Twice Weekly:** Use a sulfate-free beard shampoo to eliminate sweat and city dust without stripping natural facial oils.
2. **Lightweight Argan or Jojoba Beard Oil:** Apply 3-4 drops on damp hair to prevent beard itch and dandruff (beardruff).
3. **Professional Razor Edge:** Have a verified barber line your cheeks and neckline every two weeks to prevent scruffiness.

Find trusted beard specialists near you on [Trimly's Barbers Directory](/barbers).`,
  },
  {
    slug: "pre-grooming-checklist-indian-grooms-wedding-plan",
    title: "Pre-Grooming Checklist for Indian Grooms: 30-Day Wedding Salon Plan",
    excerpt:
      "Step-by-step 30-day wedding grooming timeline for grooms in India. Haircut scheduling, skin detox, beard styling, and package rate estimates.",
    category: "Wedding Grooming",
    tags: ["wedding groom", "dulha grooming", "pre wedding salon", "indian wedding plan"],
    author: {
      name: "Siddharth Jain",
      role: "Celebrity Grooming & Bridal Specialist",
      avatar: null,
    },
    status: "draft",
    readingTime: "7 min read",
    seoTitle: "Indian Groom Pre-Wedding Grooming Checklist (30-Day Plan)",
    seoDescription:
      "A complete 30-day grooming checklist for Indian grooms. Haircut timing, beard sculpting, facial treatments, and wedding day preparation.",
    coverImage: "/images/hero-salon.webp",
    faq: [
      {
        question: "When should an Indian groom get his final haircut before the wedding?",
        answer:
          "Schedule your final haircut 3 to 5 days before the first wedding ceremony (e.g., Sangeet or Mehendi). This allows the fade to soften naturally while staying crisp.",
      },
      {
        question: "Can grooms do facials right before the wedding day?",
        answer:
          "Never do a deep extraction facial on the wedding day. Schedule deep cleanses 10 to 14 days prior, and only take a gentle hydration / de-tan cleanup 2 days before.",
      },
    ],
    content: `# Pre-Grooming Checklist for Indian Grooms: 30-Day Wedding Salon Plan

With Indian weddings being high-definition, multi-day celebrations with thousands of photographs, the modern groom can no longer afford to leave his grooming to a last-minute haircut on the morning of the Haldi.

Here is the definitive 30-day grooming roadmap crafted by master Indian salon stylists to make sure you look sharp, refreshed, and effortless throughout your wedding festivities.

---

## Phase 1: 30 Days Out — The Trial & Foundation
- **Haircut Trial:** Get your haircut with your preferred barber now. This allows you to evaluate how the style looks in pre-wedding photo shoots and verify how fast your hair grows back.
- **Consult on Beard Growth:** If you want a fuller wedding beard, stop heavy DIY trimming and let your beard grow for shape sculpting.
- **Deep Pore Skin Treatment:** Schedule a charcoal detox or Hydrafacial with a salon specialist to clear blackheads and sun tan without risking ceremony-day redness.

---

## Phase 2: 14 Days Out — Mid-Cycle Refinement
- **Beard Shaping & Neckline Cleanup:** Have your barber establish the exact jawline angle for your sherwani collar.
- **Mani-Pedi Grooming:** Keep nails clean and cuticles trimmed. Ring exchange photos put groom hands under direct camera zoom.
- **Hydration Routine:** Double your daily water intake and use an SPF 50 sunscreen daily when traveling for wedding shopping.

---

## Phase 3: 4 Days Out — The Final Precision Cut
- **The Wedding Haircut:** Book your final haircut appointment 3-4 days before the Mehendi/Sangeet. This is the sweet spot where side fades look crisp and the top texture settles naturally.
- **Gentle De-Tan & Glow Treatment:** A soothing Vitamin C or milk enzyme facial to brighten tired skin from late-night planning.
- **Hot Towel Beard Alignment:** Crisp razor line with soothing aftershave balm.

---

## Phase 4: Wedding Day — Zero-Stress Touchup
- Hair styling with light matte clay (avoid shiny wet gel that reflects camera flashes).
- Light beard balm for flyaway control.
- Subtle matte lip balm for dry lips.

Explore [wedding groom packages on Trimly](/services/bridal-grooming) and book your appointments in advance.`,
  },
];

async function main() {
  await client.connect();
  const db = client.db(dbName);

  for (const post of DRAFT_POSTS) {
    const existing = await db.collection("posts").findOne({ slug: post.slug });
    if (!existing) {
      const now = new Date();
      await db.collection("posts").insertOne({
        ...post,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Seeded draft post: ${post.title}`);
    } else {
      console.log(`Post already exists: ${post.slug}`);
    }
  }

  await client.close();
  console.log("Blog seeding complete.");
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});

