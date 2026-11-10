import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Clock, Share2, Scissors, MapPin, CheckCircle2, User, HelpCircle } from "lucide-react";
import { getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Article Not Found | Trimly Blog" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trimly.in";
  const title = post.seoTitle || `${post.title} | Trimly`;
  const description = post.seoDescription || post.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/blog/${post.slug}`,
      siteName: "Trimly",
      locale: "en_IN",
      type: "article",
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author?.name || "Trimly Editorial Team"],
      images: [
        {
          url: post.coverImage || `${appUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [post.coverImage || `${appUrl}/og-image.jpg`],
    },
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "";
  }
}

function renderSimpleMarkdown(md = "") {
  if (!md) return "";
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-8 mb-3 text-foreground">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl sm:text-3xl font-extrabold mt-10 mb-4 text-foreground pb-2 border-b border-border/60">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl sm:text-4xl font-extrabold mt-10 mb-6 text-foreground">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/30 rounded-r-xl italic text-muted-foreground">$1</blockquote>')
    .replace(/^\s*-\s+(.*$)/gim, '<li class="ml-6 list-disc text-muted-foreground leading-relaxed my-1.5">$1</li>')
    .replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-6 list-decimal text-muted-foreground leading-relaxed my-1.5">$1</li>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-primary font-semibold underline underline-offset-4 hover:text-primary/80">$1</a>')
    .replace(/^\s*(\n)?(.+)/gim, function (m) {
      return /<(\/)?(h1|h2|h3|blockquote|li|ul|ol)/.test(m)
        ? m
        : '<p class="text-base text-muted-foreground leading-relaxed my-4">' + m + "</p>";
    });
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trimly.in";
  const postUrl = `${appUrl}/blog/${post.slug}`;
  const relatedPosts = await getRelatedPosts(post.category, post.slug, 3);

  // Article JSON-LD
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage || `${appUrl}/og-image.jpg`,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.publishedAt || post.createdAt,
    author: {
      "@type": "Person",
      name: post.author?.name || "Trimly Editorial Team",
      jobTitle: post.author?.role || "Grooming Specialist",
    },
    publisher: {
      "@type": "Organization",
      name: "Trimly",
      logo: {
        "@type": "ImageObject",
        url: `${appUrl}/logo.webp`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };

  // Breadcrumbs JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: appUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${appUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  // Optional FAQPage JSON-LD
  const faqJsonLd = post.faq && post.faq.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <article className="bg-background min-h-screen py-10 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-10">
        {/* Navigation Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{post.title}</span>
        </nav>

        {/* Post Header */}
        <header className="space-y-6">
          {post.category && (
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-bold text-primary uppercase tracking-wider">
              {post.category}
            </span>
          )}

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.18] text-foreground">
            {post.title}
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-y border-border/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                {post.author?.name ? post.author.name[0] : "T"}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{post.author?.name || "Trimly Team"}</p>
                <p className="text-[11px] text-muted-foreground">{post.author?.role || "Editorial Specialist"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                {formatDate(post.publishedAt || post.createdAt)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                {post.readingTime || "4 min read"}
              </span>
            </div>
          </div>
        </header>

        {/* Featured Cover Image */}
        {post.coverImage && (
          <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden border border-border/80 shadow-md bg-muted">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 800px"
              className="object-cover"
            />
          </div>
        )}

        {/* Body Content */}
        <div
          className="prose prose-neutral dark:prose-invert max-w-none pt-4 text-foreground/90 space-y-4"
          dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(post.content) }}
        />

        {/* In-Article FAQ Section if provided */}
        {post.faq && post.faq.length > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 space-y-4 mt-8">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              Frequently Asked Questions
            </div>
            <div className="space-y-4 pt-2">
              {post.faq.map((item, idx) => (
                <div key={idx} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <h4 className="font-bold text-base text-foreground mb-1">{item.question}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contextual Local Booking CTA */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-primary/15 via-card to-secondary/10 border border-primary/30 space-y-4 shadow-lg text-center sm:text-left sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div className="space-y-2 max-w-lg">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center justify-center sm:justify-start gap-1">
              <Scissors className="w-3.5 h-3.5" /> Book Your Next Haircut
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              Ready for a fresh cut or beard style?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Find verified barbers across Indore, Bhopal, Mumbai, Delhi-NCR, Bengaluru and book open slots in real-time.
            </p>
          </div>
          <Link href="/barbers" className="shrink-0 mt-4 sm:mt-0 block">
            <Button size="lg" className="rounded-xl px-8 font-semibold shadow-md gap-2 w-full sm:w-auto">
              Find a Barber <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="pt-8 border-t border-border/60 space-y-6">
            <h3 className="text-2xl font-bold tracking-tight">Related Articles</h3>
            <div className="grid sm:grid-cols-3 gap-6">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel._id}
                  href={`/blog/${rel.slug}`}
                  className="group p-5 rounded-2xl bg-card border border-border/70 hover:border-primary/50 transition-all hover:shadow-md space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-primary uppercase">{rel.category}</span>
                    <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{rel.excerpt}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary pt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Read more <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

