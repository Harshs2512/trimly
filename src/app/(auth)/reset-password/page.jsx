"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to reset password.");
      setMessage(data.message);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  if (!token || !email) return <p className="text-sm text-red-600">The reset link is incomplete or invalid.</p>;

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm password</Label><Input id="confirmPassword" type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" disabled={loading}>{loading ? "Updating..." : "Update password"}</Button>
      {message && <Link href="/login" className="block text-center text-sm text-primary hover:underline">Sign in</Link>}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p>
        <Suspense fallback={<p className="mt-6 text-sm text-muted-foreground">Loading...</p>}><ResetForm /></Suspense>
      </div>
    </div>
  );
}
