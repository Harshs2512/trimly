import { getPublishedPosts } from "@/lib/blog";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trimly.in";
  const { posts } = await getPublishedPosts({ page: 1, limit: 20 });

  const escapeXml = (unsafe = "") =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const itemsXml = posts
    .map((post) => {
      const postUrl = `${appUrl}/blog/${post.slug}`;
      const pubDate = new Date(post.publishedAt || post.createdAt).toUTCString();
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(post.excerpt || post.title)}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(post.category || "Grooming")}</category>
    </item>`;
    })
    .join("");

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Trimlly Grooming Journal</title>
    <link>${appUrl}/blog</link>
    <description>Expert Indian barber and salon guides, haircut pricing analyses, and beard styling advice.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${appUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(rssFeed, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

