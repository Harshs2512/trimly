import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSessionWithRole } from "@/lib/authz";
import { safeInternalError } from "@/lib/api";
import { calculateReadingTime, slugifyPost } from "@/lib/blog";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request, { params }) {
  try {
    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const db = await getDb();
    const post = await db.collection("posts").findOne({ _id: new ObjectId(id) });
    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    return Response.json({
      post: { ...post, _id: post._id.toString() },
    });
  } catch (err) {
    return safeInternalError(err, "admin-posts-get");
  }
}

export async function PUT(request, { params }) {
  try {
    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const body = await request.json();
    const db = await getDb();
    const currentPost = await db.collection("posts").findOne({ _id: new ObjectId(id) });
    if (!currentPost) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const now = new Date();
    const updates = { updatedAt: now };

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt.trim();
    if (body.content !== undefined) {
      updates.content = body.content;
      updates.readingTime = calculateReadingTime(body.content);
    }
    if (body.coverImage !== undefined) updates.coverImage = body.coverImage;
    if (body.category !== undefined) updates.category = body.category.trim();
    if (body.tags !== undefined && Array.isArray(body.tags)) {
      updates.tags = body.tags.map((t) => t.trim()).filter(Boolean);
    }
    if (body.seoTitle !== undefined) updates.seoTitle = body.seoTitle.trim();
    if (body.seoDescription !== undefined) updates.seoDescription = body.seoDescription.trim();
    if (body.faq !== undefined && Array.isArray(body.faq)) updates.faq = body.faq;

    if (body.slug !== undefined && body.slug.trim()) {
      const cleanSlug = slugifyPost(body.slug.trim());
      if (cleanSlug !== currentPost.slug) {
        const conflict = await db.collection("posts").findOne({ slug: cleanSlug, _id: { $ne: new ObjectId(id) } });
        if (conflict) {
          return Response.json({ error: `Slug '${cleanSlug}' already exists.` }, { status: 409 });
        }
        updates.slug = cleanSlug;
      }
    }

    if (body.status !== undefined) {
      const newStatus = body.status === "published" ? "published" : "draft";
      updates.status = newStatus;
      if (newStatus === "published" && !currentPost.publishedAt) {
        updates.publishedAt = now;
      }
    }

    await db.collection("posts").updateOne({ _id: new ObjectId(id) }, { $set: updates });

    await writeAuditLog({
      action: "UPDATE_BLOG_POST",
      actorId: session.user?.id || session.user?._id,
      actorRole: "admin",
      targetId: id,
      metadata: updates,
    });

    const updated = await db.collection("posts").findOne({ _id: new ObjectId(id) });
    return Response.json({
      ok: true,
      post: { ...updated, _id: updated._id.toString() },
    });
  } catch (err) {
    return safeInternalError(err, "admin-posts-update");
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, error } = await getSessionWithRole(["admin"]);
    if (error) return error;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return Response.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const db = await getDb();
    const res = await db.collection("posts").deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount === 0) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    await writeAuditLog({
      action: "DELETE_BLOG_POST",
      actorId: session.user?.id || session.user?._id,
      actorRole: "admin",
      targetId: id,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return safeInternalError(err, "admin-posts-delete");
  }
}

