import { ObjectId } from "mongodb";
import { getDb } from "./mongodb.js";
import { escapeRegex } from "./api.js";

export function calculateReadingTime(content = "") {
  if (!content || typeof content !== "string") return "3 min read";
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export function slugifyPost(title = "") {
  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "") || "post";
}

export async function getPublishedPosts({ page = 1, limit = 9, category = null, search = "" } = {}) {
  try {
    const db = await getDb();
    const query = { status: "published" };

    if (category && category !== "all") {
      query.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, "i") };
    }

    if (search && search.trim()) {
      const s = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: s, $options: "i" } },
        { excerpt: { $regex: s, $options: "i" } },
        { tags: { $regex: s, $options: "i" } },
      ];
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(24, Math.max(1, parseInt(limit, 10) || 9));
    const skip = (safePage - 1) * safeLimit;

    const [total, posts] = await Promise.all([
      db.collection("posts").countDocuments(query),
      db
        .collection("posts")
        .find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
    ]);

    return {
      posts: posts.map((p) => ({
        ...p,
        _id: p._id.toString(),
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  } catch (err) {
    console.error("Failed to load blog posts:", err);
    return { posts: [], pagination: { page: 1, limit: 9, total: 0, totalPages: 1 } };
  }
}

export async function getPostBySlug(slug) {
  try {
    const db = await getDb();
    const post = await db.collection("posts").findOne({ slug, status: "published" });
    if (!post) return null;
    return {
      ...post,
      _id: post._id.toString(),
    };
  } catch (err) {
    console.error(`Failed to get post by slug '${slug}':`, err);
    return null;
  }
}

export async function getAllPublishedSlugs() {
  try {
    const db = await getDb();
    const posts = await db
      .collection("posts")
      .find({ status: "published" }, { projection: { slug: 1, updatedAt: 1, publishedAt: 1 } })
      .toArray();
    return posts.map((p) => ({
      slug: p.slug,
      updatedAt: p.updatedAt || p.publishedAt,
    }));
  } catch (err) {
    console.error("Failed to get published slugs:", err);
    return [];
  }
}

export async function getRelatedPosts(category, currentSlug, limit = 3) {
  try {
    const db = await getDb();
    const posts = await db
      .collection("posts")
      .find({
        status: "published",
        slug: { $ne: currentSlug },
        ...(category ? { category } : {}),
      })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .toArray();

    return posts.map((p) => ({
      ...p,
      _id: p._id.toString(),
    }));
  } catch (err) {
    console.error("Failed to fetch related posts:", err);
    return [];
  }
}

export async function getDistinctCategories() {
  try {
    const db = await getDb();
    const cats = await db.collection("posts").distinct("category", { status: "published" });
    return cats.filter(Boolean);
  } catch (err) {
    console.error("Failed to get distinct categories:", err);
    return [];
  }
}

