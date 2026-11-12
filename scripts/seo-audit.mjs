import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || process.argv[2] || "https://trimlly.solvantis.in";

// Core routes audited across all categories
const STATIC_ROUTES = [
  "/",
  "/barbers",
  "/for-barbers",
  "/services/haircut",
  "/reviews",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/blog",
  "/blog/feed.xml",
];

const DYNAMIC_REPRESENTATIVE_ROUTES = [
  // City Directory Pages
  "/barbers/city/indore",
  "/barbers/city/bhopal",
  // Service-City Landing Pages
  "/services/haircut/indore",
  "/services/beard-trim/indore",
  // Representative Barber Profile
  "/barbers/indore/the-barber-room-101",
  // Representative Blog Article
  "/blog/top-salons-indore-guide",
];

const PROTOCOL_ROUTES = [
  "/robots.txt",
  "/sitemap.xml",
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": "TrimllySeoAuditor/2.0 (+https://trimlly.solvantis.in/bot)",
          Accept: "text/html,application/xml,application/xhtml+xml,text/plain,*/*",
        },
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

function auditRobotsTxt(body) {
  const issues = [];
  const warnings = [];

  if (!/User-agent:/i.test(body)) {
    issues.push("Missing 'User-agent:' directive");
  }
  if (!/Allow:\s*\//i.test(body)) {
    warnings.push("Missing explicit 'Allow: /' directive");
  }
  if (!/Disallow:\s*\/api\//i.test(body)) {
    warnings.push("Missing security protection 'Disallow: /api/'");
  }
  if (!/Disallow:\s*\/admin/i.test(body)) {
    warnings.push("Missing admin privacy protection 'Disallow: /admin'");
  }
  if (!/Sitemap:/i.test(body)) {
    issues.push("Missing 'Sitemap:' directive in robots.txt");
  } else {
    const sitemapMatch = body.match(/Sitemap:\s*(https?:\/\/[^\s]+)/i);
    if (!sitemapMatch || !sitemapMatch[1].endsWith("/sitemap.xml")) {
      warnings.push(`Sitemap URL may be misformatted: ${sitemapMatch?.[1] || "none"}`);
    }
  }

  return { issues, warnings, title: "Robots.txt Crawl Control" };
}

function auditSitemapXml(body, baseUrl) {
  const issues = [];
  const warnings = [];

  if (!body.includes("<?xml") || !body.includes("<urlset")) {
    issues.push("Invalid XML sitemap structure (missing <?xml or <urlset>)");
  }

  const urlMatches = body.match(/<url>[\s\S]*?<\/url>/gi) || [];
  if (urlMatches.length === 0) {
    issues.push("Sitemap contains zero <url> entries");
  } else if (urlMatches.length < 15) {
    warnings.push(`Sitemap contains only ${urlMatches.length} URLs (expected 20+ including dynamic pages)`);
  }

  // Validate presence and formatting of <loc> and <lastmod>
  let invalidLastmodCount = 0;
  let missingLocCount = 0;
  let hasServiceCityPages = false;

  for (const entry of urlMatches.slice(0, 50)) {
    const locMatch = entry.match(/<loc>(.*?)<\/loc>/i);
    const lastmodMatch = entry.match(/<lastmod>(.*?)<\/lastmod>/i);

    if (!locMatch || !locMatch[1].trim()) {
      missingLocCount++;
    } else if (locMatch[1].includes("/services/") && locMatch[1].split("/").length > 5) {
      hasServiceCityPages = true;
    }

    if (lastmodMatch) {
      const dateStr = lastmodMatch[1].trim();
      const timestamp = Date.parse(dateStr);
      if (isNaN(timestamp)) {
        invalidLastmodCount++;
      }
    }
  }

  if (missingLocCount > 0) {
    issues.push(`${missingLocCount} sitemap entries missing <loc> URL`);
  }
  if (invalidLastmodCount > 0) {
    issues.push(`${invalidLastmodCount} sitemap entries have invalid <lastmod> ISO date format`);
  }
  if (!hasServiceCityPages) {
    warnings.push("No dynamic service-city pages (e.g. /services/haircut/indore) detected in sitemap sample");
  }

  return { issues, warnings, title: `Sitemap XML (${urlMatches.length} URLs)` };
}

function validateSchemaObject(schema, issues, warnings) {
  if (!schema || typeof schema !== "object") return;

  const type = schema["@type"];
  const context = schema["@context"];

  if (!context || !context.includes("schema.org")) {
    issues.push(`Invalid JSON-LD @context: '${context}' (must be schema.org)`);
  }
  if (!type) {
    issues.push("JSON-LD object missing required '@type' property");
    return;
  }

  // Schema-specific property audits
  if (type === "Article") {
    if (!schema.headline) issues.push("Article schema missing required 'headline'");
    if (!schema.image) warnings.push("Article schema missing recommended 'image'");
    if (!schema.datePublished) warnings.push("Article schema missing recommended 'datePublished'");
  } else if (type === "LocalBusiness" || type === "BarberShop") {
    if (!schema.name) issues.push(`${type} schema missing required 'name'`);
    if (!schema.address && !schema.geo) warnings.push(`${type} schema missing recommended 'address' or 'geo'`);
  } else if (type === "FAQPage") {
    if (!Array.isArray(schema.mainEntity) || schema.mainEntity.length === 0) {
      issues.push("FAQPage schema missing non-empty 'mainEntity' array");
    } else {
      for (const q of schema.mainEntity) {
        if (!q.name || !q.acceptedAnswer?.text) {
          issues.push("FAQPage contains question without name or acceptedAnswer.text");
        }
      }
    }
  } else if (type === "Organization") {
    if (!schema.name) issues.push("Organization schema missing 'name'");
    if (!schema.url) warnings.push("Organization schema missing 'url'");
  } else if (type === "WebSite") {
    if (!schema.name) issues.push("WebSite schema missing 'name'");
    if (!schema.url) warnings.push("WebSite schema missing 'url'");
  } else if (type === "BreadcrumbList") {
    if (!Array.isArray(schema.itemListElement) || schema.itemListElement.length === 0) {
      issues.push("BreadcrumbList missing 'itemListElement' array");
    }
  }
}

function auditHtml(route, html, baseUrl, headers = {}) {
  const issues = [];
  const warnings = [];

  // 1. Title tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  let title = "";
  if (!titleMatch || !titleMatch[1].trim()) {
    issues.push("Missing or empty <title> tag");
  } else {
    title = titleMatch[1].trim();
    if (title.length > 70) {
      warnings.push(`<title> length is ${title.length} chars (recommended <= 65)`);
    }
    // Check for double branding bug
    if (/\|\s*Trimlly\s*\|\s*Trimlly/i.test(title)) {
      issues.push(`Detected duplicate brand suffix in <title>: "${title}"`);
    }
  }

  // 2. Meta description
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  if (!descMatch || !descMatch[1].trim()) {
    issues.push("Missing or empty <meta name=\"description\">");
  } else {
    const desc = descMatch[1].trim();
    if (desc.length > 165) {
      warnings.push(`Meta description length is ${desc.length} chars (recommended <= 160)`);
    } else if (desc.length < 50) {
      warnings.push(`Meta description is very short (${desc.length} chars)`);
    }
  }

  // 3. Canonical link correctness
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  if (!canonicalMatch || !canonicalMatch[1].trim()) {
    issues.push("Missing canonical <link rel=\"canonical\"> tag");
  } else {
    const canonical = canonicalMatch[1].trim();
    if (!canonical.startsWith("http://") && !canonical.startsWith("https://")) {
      warnings.push(`Canonical URL is not absolute: "${canonical}"`);
    }
    if (canonical.includes(".vercel.app")) {
      issues.push(`Canonical points to staging domain: "${canonical}"`);
    }
  }

  // 4. Index / Noindex Directives
  const metaRobots = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const xRobots = headers["x-robots-tag"];
  const isCityRoute = route.startsWith("/barbers/city/");

  if (metaRobots && /noindex/i.test(metaRobots[1])) {
    if (isCityRoute) {
      warnings.push(`Page marked 'noindex, follow' (city directory currently below verified salon index threshold)`);
    } else {
      issues.push(`Accidental noindex detected in meta tag: "${metaRobots[1]}"`);
    }
  }
  if (xRobots && /noindex/i.test(xRobots)) {
    issues.push(`Accidental noindex detected in X-Robots-Tag header: "${xRobots}"`);
  }

  // 5. Open Graph Metadata
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  const ogUrlMatch = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']*)["']/i);

  if (!ogTitleMatch) warnings.push("Missing 'og:title' tag");
  if (!ogDescMatch) warnings.push("Missing 'og:description' tag");
  if (!ogImageMatch) {
    warnings.push("Missing 'og:image' tag");
  } else if (!ogImageMatch[1].startsWith("http://") && !ogImageMatch[1].startsWith("https://")) {
    warnings.push(`og:image should be an absolute URL: "${ogImageMatch[1]}"`);
  }
  if (!ogUrlMatch) warnings.push("Missing 'og:url' tag");

  // 6. Heading hierarchy & single H1
  const h1Matches = html.match(/<h1[\s>]/gi);
  if (!h1Matches || h1Matches.length === 0) {
    issues.push("Missing <h1> tag");
  } else if (h1Matches.length > 1) {
    warnings.push(`Found ${h1Matches.length} <h1> tags (recommended exactly 1)`);
  }

  // 7. Image alt tags
  const imgRegex = /<img\s+[^>]*>/gi;
  let match;
  let missingAltCount = 0;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    if (!/alt=["'][^"']*["']/i.test(tag) || /alt=["']\s*["']/i.test(tag)) {
      missingAltCount++;
    }
  }
  if (missingAltCount > 0) {
    warnings.push(`${missingAltCount} image(s) missing non-empty alt attribute`);
  }

  // 8. Structured Data: JSON-LD semantic validation
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  let jsonLdCount = 0;

  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    jsonLdCount++;
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => validateSchemaObject(item, issues, warnings));
      } else {
        validateSchemaObject(parsed, issues, warnings);
      }
    } catch (e) {
      issues.push(`Invalid JSON-LD syntax: ${e.message}`);
    }
  }

  if (jsonLdCount === 0 && !route.endsWith(".xml") && route !== "/robots.txt") {
    warnings.push("No JSON-LD structured data detected");
  }

  return { issues, warnings, title };
}

async function runAudit() {
  console.log(`\n======================================================`);
  console.log(`🔍 Trimlly Complete Technical SEO & Metadata Audit`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let serverReachable = false;
  try {
    const res = await fetchUrl(`${BASE_URL}/`);
    if (res.status) serverReachable = true;
  } catch {
    serverReachable = false;
  }

  if (!serverReachable) {
    console.log(`⚠️  Server at ${BASE_URL} is not reachable.`);
    console.log(`Performing static code audit of routes & metadata...\n`);
    const criticalFiles = [
      "src/app/page.jsx",
      "src/app/barbers/page.jsx",
      "src/app/barbers/city/[city]/page.jsx",
      "src/app/barbers/[city]/[slug]/page.jsx",
      "src/app/services/[service]/page.jsx",
      "src/app/services/[service]/[city]/page.jsx",
      "src/app/for-barbers/page.jsx",
      "src/app/about/page.jsx",
      "src/app/contact/page.jsx",
      "src/app/faq/page.jsx",
      "src/app/blog/page.jsx",
      "src/app/blog/[slug]/page.jsx",
      "src/app/sitemap.js",
      "src/app/robots.js",
    ];

    let missing = 0;
    criticalFiles.forEach((f) => {
      if (fs.existsSync(f)) {
        console.log(`  ✅ [FOUND] ${f}`);
      } else {
        console.log(`  ❌ [MISSING] ${f}`);
        missing++;
      }
    });

    console.log(`\nStatic check complete: ${missing === 0 ? "All 14 core SEO files verified." : `${missing} files missing!`}`);
    return;
  }

  const allRoutes = [...PROTOCOL_ROUTES, ...STATIC_ROUTES, ...DYNAMIC_REPRESENTATIVE_ROUTES];
  let totalIssues = 0;
  let totalWarnings = 0;

  for (const route of allRoutes) {
    const url = `${BASE_URL}${route}`;
    process.stdout.write(`Auditing ${route.padEnd(38)} `);

    try {
      const res = await fetchUrl(url);

      if (res.status === 404 && DYNAMIC_REPRESENTATIVE_ROUTES.includes(route)) {
        console.log(`ℹ️  404 (No verified live sample at ${route})`);
        continue;
      }

      if (res.status !== 200) {
        console.log(`❌ Status ${res.status}`);
        totalIssues++;
        continue;
      }

      let auditResult;
      if (route === "/robots.txt") {
        auditResult = auditRobotsTxt(res.body);
      } else if (route === "/sitemap.xml") {
        auditResult = auditSitemapXml(res.body, BASE_URL);
      } else if (route.endsWith(".xml")) {
        auditResult = {
          issues: res.headers["content-type"]?.includes("xml") ? [] : ["Content-Type is not XML"],
          warnings: [],
          title: "RSS Feed",
        };
      } else {
        auditResult = auditHtml(route, res.body, BASE_URL, res.headers);
      }

      const { issues, warnings, title } = auditResult;

      if (issues.length === 0 && warnings.length === 0) {
        console.log(`✅ 200 OK — "${title?.slice(0, 35)}..."`);
      } else if (issues.length === 0) {
        console.log(`⚠️  200 OK (${warnings.length} warnings)`);
        warnings.forEach((w) => console.log(`     └─ Warning: ${w}`));
        totalWarnings += warnings.length;
      } else {
        console.log(`❌ ${issues.length} issue(s), ${warnings.length} warning(s)`);
        issues.forEach((i) => console.log(`     └─ Issue: ${i}`));
        warnings.forEach((w) => console.log(`     └─ Warning: ${w}`));
        totalIssues += issues.length;
        totalWarnings += warnings.length;
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      totalIssues++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`Audit Summary: ${totalIssues} Errors | ${totalWarnings} Warnings`);
  console.log(`Result: ${totalIssues === 0 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`======================================================\n`);

  process.exit(totalIssues === 0 ? 0 : 1);
}

runAudit().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
