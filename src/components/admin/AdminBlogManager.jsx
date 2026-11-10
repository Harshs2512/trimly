"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminBlogManager() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState("Hair Care");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formCoverImage, setFormCoverImage] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDesc, setFormSeoDesc] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete Confirmation State
  const [deletingPost, setDeletingPost] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPosts = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });

      const res = await fetch(`/api/admin/posts?${q.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load posts");

      setPosts(data.posts || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPosts(1);
  };

  const openNewPost = () => {
    setEditingPost(null);
    setFormTitle("");
    setFormSlug("");
    setFormCategory("Hair Care");
    setFormExcerpt("");
    setFormCoverImage("");
    setFormContent("");
    setFormSeoTitle("");
    setFormSeoDesc("");
    setFormStatus("draft");
    setEditorOpen(true);
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setFormTitle(post.title || "");
    setFormSlug(post.slug || "");
    setFormCategory(post.category || "Hair Care");
    setFormExcerpt(post.excerpt || "");
    setFormCoverImage(post.coverImage || "");
    setFormContent(post.content || "");
    setFormSeoTitle(post.seoTitle || "");
    setFormSeoDesc(post.seoDescription || "");
    setFormStatus(post.status || "draft");
    setEditorOpen(true);
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setError("Title is required.");
      return;
    }

    setFormSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: formTitle.trim(),
        slug: formSlug.trim() || undefined,
        category: formCategory.trim(),
        excerpt: formExcerpt.trim(),
        coverImage: formCoverImage.trim() || null,
        content: formContent,
        seoTitle: formSeoTitle.trim() || formTitle.trim(),
        seoDescription: formSeoDesc.trim() || formExcerpt.trim(),
        status: formStatus,
      };

      const url = editingPost ? `/api/admin/posts/${editingPost._id}` : "/api/admin/posts";
      const method = editingPost ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save post");

      setSuccess(editingPost ? "Post updated successfully!" : "Post created successfully!");
      setEditorOpen(false);
      fetchPosts(pagination.page);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const togglePublishStatus = async (post) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/admin/posts/${post._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      setSuccess(`Post status changed to ${newStatus}`);
      fetchPosts(pagination.page);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPost) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/posts/${deletingPost._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete post");
      setSuccess("Post deleted.");
      setDeletingPost(null);
      fetchPosts(pagination.page);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Blog Management</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Publish SEO guides, haircut cost analyses, and groom tips to drive organic traffic across India.
          </p>
        </div>

        <Button onClick={openNewPost} className="rounded-xl font-semibold gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Create Article
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-xs rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
          {success}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          {["all", "published", "draft"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="w-full md:w-72 flex items-center gap-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-card border border-border/70 focus:outline-none focus:border-primary"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="rounded-xl px-3 text-xs">
            Search
          </Button>
        </form>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading posts...</div>
      ) : posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post._id}
              className="p-5 rounded-2xl bg-card border border-border/70 hover:border-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      post.status === "published"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}
                  >
                    {post.status}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{post.category}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{post.readingTime || "3 min read"}</span>
                </div>

                <h3 className="font-bold text-base text-foreground leading-snug">
                  {post.title}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-1">
                  /blog/{post.slug} &bull; {post.excerpt || "No excerpt"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {post.status === "published" && (
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="View post on live site"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => togglePublishStatus(post)}
                  className="rounded-xl text-xs"
                >
                  {post.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditPost(post)}
                  className="rounded-xl text-xs gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingPost(post)}
                  className="rounded-xl text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-card border border-border/70 space-y-3">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm">No Blog Posts Found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click &ldquo;Create Article&rdquo; above to write your first grooming guide or price analysis.
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4">
          <span>Total {pagination.total} articles</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchPosts(pagination.page - 1)}
              className="rounded-xl text-xs"
            >
              Previous
            </Button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchPosts(pagination.page + 1)}
              className="rounded-xl text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Blog Article" : "Create Blog Article"}</DialogTitle>
            <DialogDescription>
              Write rich Markdown content with SEO titles and meta descriptions for search indexing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePost} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Title *</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Men's Haircut Prices in India (2026)"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Slug (auto-derived if blank)</label>
                <Input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="e.g. mens-haircut-prices-india"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border"
                >
                  <option value="Hair Care">Hair Care</option>
                  <option value="Beard Styling">Beard Styling</option>
                  <option value="Grooming Trends">Grooming Trends</option>
                  <option value="Salon Advice">Salon Advice</option>
                  <option value="Wedding Grooming">Wedding Grooming</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Publish Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border"
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published (Public)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Excerpt / Summary (shows in Google search)</label>
              <Input
                value={formExcerpt}
                onChange={(e) => setFormExcerpt(e.target.value)}
                placeholder="Short 1-2 sentence overview of the article..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Cover Image URL (optional)</label>
              <Input
                value={formCoverImage}
                onChange={(e) => setFormCoverImage(e.target.value)}
                placeholder="e.g. /images/hero-salon.webp or https://..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Markdown Content</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={10}
                className="w-full p-3 font-mono text-xs rounded-md bg-background border border-border focus:outline-none focus:border-primary"
                placeholder="# Heading 1&#10;## Heading 2&#10;Write your article in Markdown here..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-1">
                <label className="text-xs font-semibold">SEO Title Tag (optional)</label>
                <Input
                  value={formSeoTitle}
                  onChange={(e) => setFormSeoTitle(e.target.value)}
                  placeholder="Leave empty to use main title"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">SEO Meta Description (optional)</label>
                <Input
                  value={formSeoDesc}
                  onChange={(e) => setFormSeoDesc(e.target.value)}
                  placeholder="Leave empty to use excerpt"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingPost} onOpenChange={(open) => !open && setDeletingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingPost?.title}&rdquo;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPost(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePost} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

