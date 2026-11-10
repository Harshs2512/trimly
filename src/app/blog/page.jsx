import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Clock, BookOpen, Search, Scissors, Tag } from "lucide-react";
import { getPublishedPosts, getDistinctCategories } from "@/lib/blog";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

export const metadata = {
  title: "Trimly Grooming Journal: Indian Salon Trends & Barber Advice",
  description:
    "Expert grooming advice, haircut pricing breakdowns, beard styling tips, and wedding salon checklists for men and women across India.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Trimly Grooming Journal: Indian Salon Trends & Barber Advice",
    description:
      "Expert grooming advice, haircut pricing breakdowns, beard styling tips, and wedding salon checklists across India.",
    url: "/blog",
    siteName: "Trimly",
    locale: "en_IN",
    type: "website",
  },
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "";
  }
}

export default async function BlogIndexPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page, 10) || 1);
  const category = resolvedParams?.category || "";
  const search = resolvedParams?.search || "";

  const [{ posts, pagination }, categories] = await Promise.all([
    getPublishedPosts({ page, limit: 9, category, search }),
    getDistinctCategories(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Trimly Grooming Journal",
    description: "Expert grooming advice, haircut pricing, and barber shop guides for Indian cities.",
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://trimly.in"}/blog`,
  };

  return (
    <div className="bg-background min-h-screen py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-12">
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            Trimly Grooming Journal
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Indian Grooming Guides & <span className="text-primary">Barber Insights</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Honest pricing breakdowns, face-shape styling guides, and professional advice from verified Indian salon specialists.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Link
              href="/blog"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                !category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Topics
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/blog?category=${encodeURIComponent(cat)}`}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  category.toLowerCase() === cat.toLowerCase()
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>

          <form action="/blog" method="GET" className="w-full md:w-72 flex items-center gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search articles..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-background border border-border/70 focus:outline-none focus:border-primary"
              />
            </div>
            <Button type="submit" size="sm" className="rounded-xl px-4 text-xs font-semibold">
              Filter
            </Button>
          </form>
        </div>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post._id}
                className="group rounded-2xl bg-card border border-border/70 hover:border-primary/50 transition-all hover:shadow-lg overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/9] w-full bg-muted/60 overflow-hidden">
                    <Image
                      src={post.coverImage || "/images/hero-salon.webp"}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {post.category && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-background/90 backdrop-blur-md text-[11px] font-bold text-primary border border-white/20">
                        {post.category}
                      </span>
                    )}
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(post.publishedAt || post.createdAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readingTime || "4 min read"}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>

                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-border/50 flex items-center justify-between text-xs mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                      {post.author?.name ? post.author.name[0] : "T"}
                    </div>
                    <span className="font-medium text-foreground">{post.author?.name || "Trimly Team"}</span>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1"
                  >
                    Read article <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 rounded-3xl bg-card border border-border/70 max-w-lg mx-auto space-y-4">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-xl font-bold">No Published Articles Found</h3>
            <p className="text-sm text-muted-foreground">
              {search || category
                ? "No articles matched your search or category filter. Try viewing all topics."
                : "New grooming guides and salon cost analyses will be published soon!"}
            </p>
            <Link href="/blog">
              <Button variant="outline" className="rounded-xl text-xs font-semibold">
                Reset Filters
              </Button>
            </Link>
          </div>
        )}

        {/* Crawlable Pagination */}
        {pagination.totalPages > 1 && (
          <nav className="flex justify-center items-center gap-2 pt-6" aria-label="Blog pagination">
            {pagination.page > 1 && (
              <Link
                href={`/blog?page=${pagination.page - 1}${category ? `&category=${encodeURIComponent(category)}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                rel="prev"
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:border-primary"
              >
                ← Previous
              </Link>
            )}
            <span className="text-xs text-muted-foreground px-3">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/blog?page=${pagination.page + 1}${category ? `&category=${encodeURIComponent(category)}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                rel="next"
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:border-primary"
              >
                Next →
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}

