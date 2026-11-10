import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { escapeRegex, parsePagination, safeInternalError } from "@/lib/api";
import { calculateReadingTime, slugifyPost } from "@/lib/blog";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request) {
  try {
    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const status = url.searchParams.get("status")?.trim();
    const search = url.searchParams.get("search")?.trim();

    const db = await getDb();
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const reg = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [{ title: reg }, { category: reg }, { slug: reg }];
    }

    const [total, posts, publishedCount, draftCount] = await Promise.all([
      db.collection("posts").countDocuments(query),
      db.collection("posts").find(query).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection("posts").countDocuments({ status: "published" }),
      db.collection("posts").countDocuments({ status: "draft" }),
    ]);

    return Response.json({
      posts: posts.map((p) => ({ ...p, _id: p._id.toString() })),
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      counts: {
        all: total,
        published: publishedCount,
        draft: draftCount,
      },
    });
  } catch (err) {
    return safeInternalError(err, "admin-posts-list");
  }
}

export async function POST(request) {
  try {
    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const body = await request.json();
    const title = body.title?.trim();
    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const db = await getDb();
    const slug = body.slug?.trim() ? slugifyPost(body.slug.trim()) : slugifyPost(title);

    // Check slug uniqueness
    const existing = await db.collection("posts").findOne({ slug });
    if (existing) {
      return Response.json({ error: `Slug '${slug}' already exists. Please choose a different slug.` }, { status: 409 });
    }

    const content = body.content || "";
    const readingTime = calculateReadingTime(content);
    const now = new Date();
    const status = body.status === "published" ? "published" : "draft";

    const newPost = {
      slug,
      title,
      excerpt: body.excerpt?.trim() || "",
      content,
      coverImage: body.coverImage?.trim() || null,
      category: body.category?.trim() || "Grooming",
      tags: Array.isArray(body.tags) ? body.tags.map((t) => t.trim()).filter(Boolean) : [],
      author: {
        name: body.author?.name?.trim() || session.user?.name || "Trimly Editorial",
        role: body.author?.role?.trim() || "Grooming Specialist",
        avatar: body.author?.avatar?.trim() || null,
      },
      status,
      readingTime,
      seoTitle: body.seoTitle?.trim() || title,
      seoDescription: body.seoDescription?.trim() || body.excerpt?.trim() || "",
      faq: Array.isArray(body.faq) ? body.faq : [],
      publishedAt: status === "published" ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    const res = await db.collection("posts").insertOne(newPost);

    await writeAuditLog({
      action: "CREATE_BLOG_POST",
      actorId: session.user?.id || session.user?._id,
      actorRole: "admin",
      targetId: res.insertedId.toString(),
      metadata: { slug, title, status },
    });

    return Response.json({
      ok: true,
      post: { ...newPost, _id: res.insertedId.toString() },
    });
  } catch (err) {
    return safeInternalError(err, "admin-posts-create");
  }
}

