import https from "node:https";

function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const titleMatch = data.match(/<title[^>]*>([^<]*)<\/title>/i);
        const canonMatch = data.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
        const robotsMatch = data.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
        const descMatch = data.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
        const h1Matches = [...data.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
        const h2Matches = [...data.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
        const h3Matches = [...data.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
        const h4Matches = [...data.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
        const jsonLdScripts = [...data.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

        resolve({
          url,
          status: res.statusCode,
          headers: {
            "content-type": res.headers["content-type"],
            "x-robots-tag": res.headers["x-robots-tag"] || null,
            server: res.headers.server,
          },
          bodyLength: data.length,
          title: titleMatch ? titleMatch[1].trim() : null,
          description: descMatch ? descMatch[1].trim() : null,
          canonical: canonMatch ? canonMatch[1].trim() : null,
          metaRobots: robotsMatch ? robotsMatch[1].trim() : null,
          h1: h1Matches,
          h2Count: h2Matches.length,
          h3Count: h3Matches.length,
          h4Count: h4Matches.length,
          jsonLdCount: jsonLdScripts.length,
          snippet: data.slice(0, 400).replace(/\s+/g, " ")
        });
      });
    }).on("error", err => resolve({ url, error: err.message }));
  });
}

async function run() {
  const urls = [
    "https://trimlly.solvantis.in/",
    "https://trimlly.solvantis.in/robots.txt",
    "https://trimlly.solvantis.in/sitemap.xml",
    "https://trimlly.solvantis.in/for-barbers",
    "https://trimlly.solvantis.in/barbers",
    "https://trimlly.solvantis.in/reviews",
    "https://trimlly.solvantis.in/blog",
    "https://trimlly.solvantis.in/about",
    "https://trimlly.solvantis.in/contact",
    "https://trimly-teal.vercel.app/"
  ];

  console.log("Probing live URLs on https://trimlly.solvantis.in...");
  const results = await Promise.all(urls.map(testUrl));
  console.log(JSON.stringify(results, null, 2));
}

run();

