# SEO Baseline — Trimly (Recorded: 2026-11-10)

> [!IMPORTANT]
> Run Lighthouse in Chrome DevTools (Mobile device, Moto G4 preset, Throttling: Slow 4G)
> against your **production** or `npm run build && npm run start` local URL.
> Fill in the **Measured** columns after each Lighthouse run.

---

## Route Inventory & Current Metadata (pre-Phase-3)

| Route | Type | `<title>` (pre-fix) | `description` (pre-fix) |
|---|---|---|---|
| `/` | Server Component | `Trimly - Modern Grooming & Barber Appointments` | `Browse curated artisan barbers, check real-time availability...` |
| `/barbers` | **`"use client"` — SEO blocker** | `Find Barbers Near You \| Trimly` (from layout) | `Browse our directory of top barbers...` |
| `/barbers/[id]` | **`"use client"` — SEO blocker** | *(no per-barber title/meta)* | *(none — biggest SEO loss)* |
| `/reviews` | Unknown | *(uses global default)* | *(none)* |
| `/privacy` | Server Component | `Privacy Policy \| Trimly` | `Privacy Policy for Trimly...` |
| `/terms` | Server Component | `Terms of Service \| Trimly` | `Terms of Service for Trimly...` |
| `/login` | `"use client"` | *(global default)* | *(none)* |

> [!NOTE]
> Phase-1 fixes already applied: `lang="en-IN"`, improved global title/desc, removed `keywords` meta,
> updated JSON-LD to Organization + WebSite (with SearchAction), `eslint-config-next` aligned to `^16.4.2`,
> brand normalized to "Trimly", GA4 and GSC wired via env vars.
> Phase-3 will convert `/barbers` and `/barbers/[id]` to Server Components with proper `generateMetadata`.

---

## Lighthouse Mobile Scores (to be measured)

### `/` (Homepage)
| Metric | Baseline (pre-work) | After Phase 3 | After Phase 4 |
|---|---|---|---|
| Performance | _(run Lighthouse)_ | | |
| Accessibility | | | |
| Best Practices | | | |
| SEO | | | |
| LCP | | | |
| CLS | | | |
| INP | | | |

### `/barbers` (Directory)
| Metric | Baseline | After Phase 3 |
|---|---|---|
| Performance | _(run Lighthouse)_ | |
| SEO | | |
| LCP | | |
| CLS | | |

### `/barbers/[id]` (Barber Detail — pick a real verified barber)
| Metric | Baseline | After Phase 3 |
|---|---|---|
| Performance | _(run Lighthouse)_ | |
| SEO | | |
| LCP | | |
| CLS | | |
| JSON-LD valid (Rich Results Test) | No schema | |

---

## How to Run Lighthouse (mobile)

1. Open Chrome → `F12` → Lighthouse tab
2. Device: **Mobile**
3. Categories: Performance, Accessibility, Best Practices, SEO
4. Click **Analyze page load**
5. Record all 4 scores + LCP, CLS, INP from the Core Web Vitals section

Or use the CLI:
```bash
npx lighthouse http://localhost:3000 --preset=peregrine --output=html --output-path=./docs/lighthouse-home.html
npx lighthouse http://localhost:3000/barbers --preset=peregrine --output=html --output-path=./docs/lighthouse-barbers.html
```

---

## SEO Issues Identified (pre-Phase-3)

### 🔴 Critical
1. `/barbers/page.jsx` is `"use client"` — Google gets empty HTML shell
2. `/barbers/[id]/page.jsx` is `"use client"` — no title, description, canonical, OG or JSON-LD
3. No `LocalBusiness`/`BarberShop` structured data on barber detail pages
4. No per-barber `generateMetadata`

### 🟠 High
5. Hero H1: "Curated Master Stylists" — zero search intent keywords
6. No city landing pages (`/barbers/city/indore`, etc.)
7. No service pages (`/services/haircut`, etc.)
8. `Testimonials.jsx` shows internal product-state cards, not real testimonials

### 🟡 Medium
9. Hero image: `hero-salon.jpg` ~193 KB (not WebP/AVIF)
10. `auth-bg.png` ~841 KB — not optimized
11. `logo.png` ~220 KB — should be WebP, ideally SVG
12. Nav links `/#about`, `/#features`, `/#benefits` — no real pages
13. Footer: "Trimly Grooming Ltd." (legal name unconfirmed), filler copy ✅ Fixed in Phase 1
14. `lang="en"` → should be `en-IN` ✅ Fixed in Phase 1

---

## Target Metrics (after Phase 3)

| Metric | Target |
|---|---|
| Lighthouse SEO (mobile) | 100 |
| Lighthouse Performance (mobile) | ≥ 85 |
| LCP | < 2.5 s |
| CLS | < 0.1 |
| INP | < 200 ms |
| Rich Results Test | Pass (LocalBusiness + BreadcrumbList) |

---

*This file is updated at the end of each phase with measured numbers.*

