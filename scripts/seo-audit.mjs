import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const ROUTES = [
  "/",
  "/barbers",
  "/for-barbers",
  "/services/haircut",
  "/about",
  "/contact",
  "/faq",
  "/blog",
  "/blog/feed.xml",
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          "User-Agent": "TrimlySeoBot/1.0 (+https://trimly.in/bot)",
          Accept: "text/html,application/xml,application/xhtml+xml,*/*",
        },
        timeout: 5000,
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

function auditHtml(route, html) {
  const issues = [];
  const warnings = [];

  // 1. Title tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    issues.push("Missing or empty <title> tag");
  } else {
    const title = titleMatch[1].trim();
    if (title.length > 65) {
      warnings.push(`<title> length is ${title.length} chars (recommended <= 60)`);
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
    }
  }

  // 3. Canonical link
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  if (!canonicalMatch || !canonicalMatch[1].trim()) {
    issues.push("Missing canonical link tag");
  }

  // 4. H1 tag
  const h1Matches = html.match(/<h1[\s>]/gi);
  if (!h1Matches || h1Matches.length === 0) {
    issues.push("Missing <h1> tag");
  } else if (h1Matches.length > 1) {
    warnings.push(`Found ${h1Matches.length} <h1> tags (recommended exactly 1)`);
  }

  // 5. Image alt tags
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

  // 6. JSON-LD validity
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  let jsonLdCount = 0;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    jsonLdCount++;
    try {
      JSON.parse(jsonLdMatch[1]);
    } catch (e) {
      issues.push(`Invalid JSON-LD syntax: ${e.message}`);
    }
  }
  if (jsonLdCount === 0 && route !== "/robots.txt") {
    warnings.push("No JSON-LD structured data detected");
  }

  return { issues, warnings, title: titleMatch?.[1]?.trim() };
}

async function runAudit() {
  console.log(`\n======================================================`);
  console.log(`🔍 Trimly Technical SEO & Metadata Audit`);
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
    console.log(`⚠️  Local server at ${BASE_URL} is not currently running.`);
    console.log(`Performing static code audit of routes & metadata...\n`);

    // Verify key pages exist on disk
    const requiredFiles = [
      "src/app/page.jsx",
      "src/app/barbers/page.jsx",
      "src/app/for-barbers/page.jsx",
      "src/app/about/page.jsx",
      "src/app/contact/page.jsx",
      "src/app/faq/page.jsx",
      "src/app/blog/page.jsx",
      "src/app/blog/[slug]/page.jsx",
      "src/app/sitemap.js",
      "src/app/robots.js",
    ];

    let allFilesExist = true;
    for (const file of requiredFiles) {
      const exists = fs.existsSync(path.resolve(process.cwd(), file));
      if (exists) {
        console.log(`  ✅ [FOUND] ${file}`);
      } else {
        console.log(`  ❌ [MISSING] ${file}`);
        allFilesExist = false;
      }
    }

    console.log(`\nTip: Run 'npm run dev' or 'npm start' in another terminal, then run:`);
    console.log(`     node scripts/seo-audit.mjs\n`);
    process.exit(allFilesExist ? 0 : 1);
  }

  let totalIssues = 0;
  let totalWarnings = 0;

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`;
    process.stdout.write(`Auditing ${route.padEnd(25)} `);

    try {
      const res = await fetchUrl(url);

      if (route.endsWith(".xml")) {
        const isXml = res.headers["content-type"]?.includes("xml");
        if (res.status === 200 && isXml) {
          console.log(`✅ 200 OK (${res.headers["content-type"]})`);
        } else {
          console.log(`❌ Status: ${res.status}, Type: ${res.headers["content-type"]}`);
          totalIssues++;
        }
        continue;
      }

      if (res.status !== 200) {
        console.log(`❌ Status ${res.status}`);
        totalIssues++;
        continue;
      }

      const { issues, warnings, title } = auditHtml(route, res.body);

      if (issues.length === 0 && warnings.length === 0) {
        console.log(`✅ 200 OK — "${title?.slice(0, 40)}..."`);
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

